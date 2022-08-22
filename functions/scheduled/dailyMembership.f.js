const functions = require('firebase-functions')
const admin = require('firebase-admin')
try { admin.initializeApp() } catch (e) {}
const verifyMessageUtils = require('../utils/verifyMessage')
const onshapeUtils = require('../utils/onshape')
const googleUtils = require('../utils/google')
const createMessageUtils = require('../utils/createMessage')
const stripeObj = require('stripe')(functions.config().stripe.token)

const runtimeOpts={timeoutSeconds:540,memory:'1GB'}

exports=module.exports=functions.runWith(runtimeOpts).pubsub.schedule('every 24 hours').onRun(async(context) => {
  try{
    const now=Date.now()
    let statistics={}
    statistics.wallet={}
    statistics.interest={}
    statistics.contract={}
    statistics.transactionIn={}
    statistics.transactionOut={}
    statistics.purchaseCOIN={}
    statistics.membersEmails=[]
    statistics.googleEmails=[]
    statistics.googleEmailsInvalid=[]
    statistics.googleEmailsMissing=[]
    statistics.onshapeEmails=[]
    statistics.onshapeUids=[]
    statistics.onshapeUidsInvalid=[]
    statistics.onshapeEmailsMissing=[]
    let listUsersResult1={}
    let listUsersResult2={}
    const appSettingsMembership=await admin.firestore().doc('appSettings/membership').get()
    let membership=appSettingsMembership.data().membership
    membership.amountRequiredDays=(now/1000/3600/24-(membership.amountRequiredBaseTimestamp||{}).seconds/3600/24)||0
    membership.amountRequired=Math.max(membership.amountRequiredBase,membership.amountRequiredBase*Math.exp(membership.amountRequiredIncreaseRate/365*membership.amountRequiredDays))
    await admin.firestore().doc('appSettings/membership').update({membership:membership})
    listUsersResult1=await admin.auth().listUsers(1000)
    if(listUsersResult1.pageToken)listUsersResult2=await admin.auth().listUsers(1000,listUsersResult1.pageToken)
    let listUsersResult=listUsersResult1.users.concat(listUsersResult2.users)
    for(const userRecord of listUsersResult){
      let messageRef=''
      let messageData={}
      let lastUserMessage=await admin.firestore().collection('PERRINNMessages').where('user','==',userRecord.uid).orderBy('serverTimestamp','desc').limit(1).get()
      if(lastUserMessage.docs[0]!=undefined){
        let result=await verifyMessageUtils.verifyMessage(lastUserMessage.docs[0].id,lastUserMessage.docs[0].data())
        if (result.userStatus.isMember)statistics.membersEmails.push(result.userEmail)
        statistics.wallet.balance=((statistics.wallet||{}).balance||0)+result.wallet.balance
        statistics.interest.amount=((statistics.interest||{}).amount||0)+result.interest.amount
        statistics.interest.rateDay=statistics.wallet.balance*(Math.exp(result.interest.rateYear/365)-1)
        statistics.interest.amountCummulate=((statistics.interest||{}).amountCummulate||0)+result.interest.amountCummulate
        statistics.contract.amount=((statistics.contract||{}).amount||0)+result.contract.amount
        statistics.contract.amountCummulate=((statistics.contract||{}).amountCummulate||0)+result.contract.amountCummulate
        statistics.transactionIn.amount=((statistics.transactionIn||{}).amount||0)+result.transactionIn.amount
        statistics.transactionIn.amountCummulate=((statistics.transactionIn||{}).amountCummulate||0)+result.transactionIn.amountCummulate
        statistics.transactionOut.amount=((statistics.transactionOut||{}).amount||0)+result.transactionOut.amount
        statistics.transactionOut.amountCummulate=((statistics.transactionOut||{}).amountCummulate||0)+result.transactionOut.amountCummulate
        statistics.purchaseCOIN.amount=((statistics.purchaseCOIN||{}).amount||0)+result.purchaseCOIN.amount
        statistics.purchaseCOIN.amountCummulate=((statistics.purchaseCOIN||{}).amountCummulate||0)+result.purchaseCOIN.amountCummulate
        statistics.userCount=(statistics.userCount||0)+1
      }
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
    let stripeBalance=await stripeObj.balance.retrieve()

    let messageText=
      statistics.userCount+' visitors. '+
      statistics.membersEmails.length+' members. '+
      Math.round(statistics.wallet.balance).toFixed(0).replace(/\d(?=(\d{3})+\.)/g, '$&,')+' COINS in circulation. '+
      Math.round(statistics.interest.rateDay).toFixed(0).replace(/\d(?=(\d{3})+\.)/g, '$&,')+' COINS/day created from interest. '+
      (stripeBalance.available[0].amount/100)+stripeBalance.available[0].currency+' available in the PERRINN cash reserve.'

    createMessageUtils.createMessageAFS({
      user:'FHk0zgOQUja7rsB9jxDISXzHaro2',
      text:messageText,
      statistics:statistics,
      chain:'PERRINNStatistics',
      chatSubject:'PERRINN statistics'
    })

    console.log(statistics.userCount+' users processed.')
    console.log(statistics.membersEmails.length+' PERRINN members.')
    console.log(statistics.googleEmails.length+' Google users.')
    console.log(statistics.onshapeEmails.length+' Onshape users.')
    console.log('Members Emails: '+JSON.stringify(statistics.membersEmails))
    console.log('Google Emails: '+JSON.stringify(statistics.googleEmails))
    console.log('Onshape Emails: '+JSON.stringify(statistics.onshapeEmails))
    console.log('invalid Google Emails: '+JSON.stringify(statistics.googleEmailsInvalid))
    console.log('invalid Onshape Uids: '+JSON.stringify(statistics.onshapeUidsInvalid))
    console.log('missing Google Emails: '+JSON.stringify(statistics.googleEmailsMissing))
    console.log('missing Onshape Emails: '+JSON.stringify(statistics.onshapeEmailsMissing))

  }
  catch(error){
    console.log(error)
  }
})
