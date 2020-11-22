const functions = require('firebase-functions')
const admin = require('firebase-admin')
try { admin.initializeApp() } catch (e) {}
const emailUtils = require('../utils/email')
const verifyMessageUtils = require('../utils/verifyMessage')
const onshapeUtils = require('../utils/onshape')
const googleUtils = require('../utils/google')

const runtimeOpts={timeoutSeconds:540,memory:'1GB'}

exports=module.exports=functions.runWith(runtimeOpts).pubsub.schedule('every 24 hours').onRun(async(context) => {
  try{
    let statistics={}
    statistics.wallet={}
    statistics.interest={}
    statistics.messagingCost={}
    statistics.transactionIn={}
    statistics.transactionOut={}
    statistics.purchaseCOIN={}
    statistics.membership={}
    statistics.membersEmails=[]
    statistics.googleEmails=[]
    statistics.googleEmailsInvalid=[]
    statistics.googleEmailsMissing=[]
    statistics.onshapeEmails=[]
    statistics.onshapeUids=[]
    statistics.onshapeUidsInvalid=[]
    statistics.onshapeEmailsMissing=[]
    const listUsersResult=await admin.auth().listUsers()
    for(const userRecord of listUsersResult.users){
      let messageRef=''
      let messageData={}
      let lastUserMessage=await admin.firestore().collection('PERRINNMessages').where('user','==',userRecord.uid).orderBy('serverTimestamp','desc').limit(1).get()
      let result=await verifyMessageUtils.verifyMessage(lastUserMessage.docs[0].id,lastUserMessage.docs[0].data())
      if (result.wallet.balance>0)statistics.membersEmails.push(result.userEmail)
      statistics.wallet.balance=((statistics.wallet||{}).balance||0)+result.wallet.balance
      statistics.interest.amount=((statistics.interest||{}).amount||0)+result.interest.amount
      statistics.interest.amountCummulate=((statistics.interest||{}).amountCummulate||0)+result.interest.amountCummulate
      statistics.messagingCost.amount=((statistics.messagingCost||{}).amount||0)+result.messagingCost.amount
      statistics.messagingCost.amountWriteCummulate=((statistics.messagingCost||{}).amountWriteCummulate||0)+result.messagingCost.amountWriteCummulate
      statistics.transactionIn.amount=((statistics.transactionIn||{}).amount||0)+result.transactionIn.amount
      statistics.transactionIn.amountCummulate=((statistics.transactionIn||{}).amountCummulate||0)+result.transactionIn.amountCummulate
      statistics.transactionOut.amount=((statistics.transactionOut||{}).amount||0)+result.transactionOut.amount
      statistics.transactionOut.amountCummulate=((statistics.transactionOut||{}).amountCummulate||0)+result.transactionOut.amountCummulate
      statistics.purchaseCOIN.amount=((statistics.purchaseCOIN||{}).amount||0)+result.purchaseCOIN.amount
      statistics.purchaseCOIN.amountCummulate=((statistics.purchaseCOIN||{}).amountCummulate||0)+result.purchaseCOIN.amountCummulate
      statistics.membership.amount=((statistics.membership||{}).amount||0)+result.membership.amount
      statistics.membership.amountCummulate=((statistics.membership||{}).amountCummulate||0)+result.membership.amountCummulate
      statistics.userCount=(statistics.userCount||0)+1
    }
    const googleUsers=await googleUtils.googleGroupMembersGet()
    googleUsers.data.members.forEach(member=>{
      statistics.googleEmails.push(member.email)
    })
    statistics.googleEmails.forEach(email=>{
      if(!statistics.membersEmails.includes(email))statistics.googleEmailsInvalid.push(email)
    })
    for(const email of statistics.googleEmailsInvalid){
      await googleUtils.googleGroupMemberDelete(email)
    }
    statistics.membersEmails.forEach(email=>{
      if(!statistics.googleEmails.includes(email))statistics.googleEmailsMissing.push(email)
    })
    const onshapeUsers=await onshapeUtils.onshapeTeamMembersGet()
    onshapeUsers.items.forEach(item=>{
      statistics.onshapeEmails.push(item.member.email)
      statistics.onshapeUids.push(item.member.id)
    })
    statistics.onshapeEmails.forEach(email=>{
      if(!statistics.membersEmails.includes(email))statistics.onshapeUidsInvalid.push(statistics.onshapeUids[statistics.onshapeEmails.indexOf(email)])
    })
    for(const uid of statistics.onshapeUidsInvalid){
      await onshapeUtils.onshapeTeamMemberDelete(uid)
    }
    statistics.membersEmails.forEach(email=>{
      if(!statistics.onshapeEmails.includes(email))statistics.onshapeEmailsMissing.push(email)
    })
    statistics.serverTimestamp=admin.firestore.FieldValue.serverTimestamp()
    await admin.firestore().collection('statistics').add(statistics);

    console.log(statistics.userCount+' users processed.')
    console.log(statistics.membersEmails.length+' PERRINN members.')
    console.log(statistics.googleEmails.length+' Google users.')
    console.log(statistics.onshapeEmails.length+' Onshape users.')
    console.log('invalid Google Emails: '+JSON.stringify(statistics.googleEmailsInvalid))
    console.log('invalid Onshape Uids: '+JSON.stringify(statistics.onshapeUidsInvalid))
    console.log('missing Google Emails: '+JSON.stringify(statistics.googleEmailsMissing))
    console.log('missing Onshape Emails: '+JSON.stringify(statistics.onshapeEmailsMissing))

  }
  catch(error){
    console.log(error)
    emailUtils.sendErrorEmail(error)
  }
})
