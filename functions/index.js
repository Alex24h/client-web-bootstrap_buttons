const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

const stripe = require('stripe')(functions.config().stripe.token);

function updateKeyValue (ref,key,value) {
  return admin.database().ref(ref).child(key).once('value').then((currentValue)=>{
    if (!ref||!key||!value) {
      return;
    }
    if (currentValue.val()==value) {
      return;
    } else {
      return admin.database().ref(ref).update({
        [key]:value,
      }).then(()=>{
        return value;
      });
    }
  });
}

function createMessage (team, user, text, image, action) {
  const now = Date.now();
  return admin.database().ref('teamMessages/'+team).push({
    timestamp:now,
    text:text,
    user:user,
    image:image,
    action:action,
  }).then(()=>{
    return admin.database().ref('teamActivities/'+team).update({
      lastMessageTimestamp:now,
      lastMessageText:text,
      lastMessageUser:user,
    });
  });
}

function createTransaction (amount, sender, receiver, user, reference) {
  if (amount<=0||sender==receiver) return;
  const now = Date.now();
  return createTransactionHalf (-amount,sender,receiver,user,reference,now).then((result)=>{
    if (result.committed) {
      createTransactionHalf (amount,receiver,sender,user,reference,now);
      return 1;
    } else {
      return;
    }
  });
}

function createTransactionHalf (amount, team, otherTeam, user, reference, timestamp) {
  return admin.database().ref('PERRINNTeamBalance/'+team).child('balance').once('value').then((balanceNullCheck)=> {
    if (balanceNullCheck.val()===null) {
      admin.database().ref('PERRINNTeamBalance/'+team).update({balance:0});
    }
    return admin.database().ref('PERRINNTeamBalance/'+team).child('balance').transaction(function(balance) {
      if (balance===null) {
        return null;
      } else {
        if ((balance+amount)<0) {
          return;
        } else {
          return balance+amount;
        }
      }
    }, function(error, committed, balance) {
      if (error) {
        createMessage (team,"PERRINN","Transaction error, please contact PERRINN (perrinnlimited@gmail.com)","","warning");
      } else if (!committed) {
        createMessage (team,"PERRINN","COIN balance low","","warning");
      } else {
        admin.database().ref('PERRINNTeamBalance/'+team).update({balanceNegative:-balance.val()});
        admin.database().ref('PERRINNTeamTransactions/'+team).push({
          amount: amount,
          balance: balance.val(),
          otherTeam: otherTeam,
          reference: reference,
          requestTimestamp: timestamp,
          timestamp:admin.database.ServerValue.TIMESTAMP,
          timestampNegative:-timestamp,
          user: user,
        });
      }
    });
  });
}

exports.createPERRINNTransactionOnPaymentComplete = functions.database.ref('/teamPayments/{user}/{chargeID}/response/outcome').onCreate(event => {
  const val = event.data.val();
  if (val.seller_message=="Payment complete.") {
    return admin.database().ref('teamPayments/'+event.params.user+'/'+event.params.chargeID).once('value').then(payment=>{
      return createTransaction (payment.val().amountCOINSPurchased, "-KptHjRmuHZGsubRJTWJ", payment.val().team, "PERRINN", "Payment reference: "+event.params.chargeID).then((result)=>{
        if (result) {
          return admin.database().ref('teamPayments/'+event.params.user+'/'+event.params.chargeID+'/PERRINNTransaction').update({
            message: "COINS have been transfered to your team wallet."
          });
        }
      });
    });
  }
});

exports.updateProjectLeader = functions.database.ref('/projectTeams').onWrite(event => {
  return admin.database().ref('projectTeams/').once('value').then(projects=>{
    projects.forEach(function(project){
      admin.database().ref('projectTeams/'+project.key).once('value').then(projectTeams=>{
        projectTeams.forEach(function(projectTeam){
          if (projectTeam.val().leader) {
            admin.database().ref('projects/'+project.key).update({leader:projectTeam.key});
          }
        });
      });
    });
  });
});

exports.newStripeCharge = functions.database.ref('/teamPayments/{user}/{chargeID}').onCreate(event => {
  const val = event.data.val();
  if (val === null || val.id || val.error) return null;
  const amount = val.amountCharge;
  const currency = val.currency;
  const source = val.source;
  const idempotency_key = event.params.id;
  let charge = {amount, currency, source};
  return stripe.charges.create(charge, {idempotency_key})
  .then(response => {
    return event.data.adminRef.child('response').set(response);
  }, error => {
    event.data.adminRef.child('error').update({type: error.type});
    return event.data.adminRef.child('error').update({message: error.message});
  });
});

exports.newUserProfile = functions.database.ref('/users/{user}/{editID}').onCreate(event => {
  const profile = event.data.val();
  return admin.database().ref('PERRINNUsers/'+event.params.user).once('value').then((currentProfile)=>{
    if (currentProfile.val()==null) {
      admin.database().ref('PERRINNUsers/'+event.params.user).update({
        createdTimestamp:admin.database.ServerValue.TIMESTAMP,
      });
    }
    return updateKeyValue('PERRINNUsers/'+event.params.user,"firstName",profile.firstName).then((newFirstName)=>{
      return updateKeyValue('PERRINNUsers/'+event.params.user,"lastName",profile.lastName).then((newLastName)=>{
        return updateKeyValue('PERRINNUsers/'+event.params.user,"photoURL",profile.photoURL).then((newPhotoURL)=>{
          return updateKeyValue('PERRINNUsers/'+event.params.user,"personalTeam",profile.personalTeam).then((newPersonalTeam)=>{
            return admin.database().ref('PERRINNUsers/'+event.params.user).once('value').then(newProfile=>{
              if (newFirstName) {
                createMessage (newProfile.val().personalTeam,"PERRINN",newProfile.val().firstName+": Your first name has been updated to "+newFirstName,"","confirmation");
              }
              if (newLastName) {
                createMessage (newProfile.val().personalTeam,"PERRINN",newProfile.val().firstName+": Your last name has been updated to "+newLastName,"","confirmation");
              }
              if (newPhotoURL) {
                createMessage (newProfile.val().personalTeam,"PERRINN",newProfile.val().firstName+": Your photo has been updated","","confirmation");
              }
              if (newPersonalTeam) {
                createMessage (newProfile.val().personalTeam,"PERRINN",newProfile.val().firstName+": This is your new personal team","","confirmation");
              }
            });
          });
        });
      });
    });
  });
});

exports.newTeamProfile = functions.database.ref('/teams/{team}/{editID}').onCreate(event => {
  const profile = event.data.val();
  return admin.database().ref('PERRINNTeams/'+event.params.team).once('value').then((currentProfile)=>{
    if (currentProfile.val()==null) {
      admin.database().ref('PERRINNTeams/'+event.params.team).update({
        createdTimestamp:admin.database.ServerValue.TIMESTAMP,
      });
    }
    return updateKeyValue('PERRINNTeams/'+event.params.team,"name",profile.name).then((newName)=>{
      return updateKeyValue('PERRINNTeams/'+event.params.team,"leader",profile.leader).then((newLeader)=>{
        return updateKeyValue('PERRINNTeams/'+event.params.team,"coleader",profile.coleader).then((newColeader)=>{
          return updateKeyValue('PERRINNTeams/'+event.params.team,"photoURL",profile.photoURL).then((newPhotoURL)=>{
            return admin.database().ref('PERRINNTeams/'+event.params.team).once('value').then(newProfile=>{
              if (newName) {
                createMessage (event.params.team,"PERRINN","New team name: "+newName,"","confirmation");
              }
              if (newLeader) {
                createMessage (event.params.team,"PERRINN","New team leader","","confirmation");
              }
              if (newColeader) {
                createMessage (event.params.team,"PERRINN","New team co-leader","","confirmation");
              }
              if (newPhotoURL) {
                createMessage (event.params.team,"PERRINN","Team photo has been updated","","confirmation");
              }
            });
          });
        });
      });
    });
  });
});

exports.newMessage = functions.database.ref('/teamMessages/{team}/{message}').onCreate(event => {
  const message = event.data.val();
  admin.database().ref('PERRINNUsers/'+message.user).child('messageCount').transaction((messageCount)=>{
    if (messageCount==null) {
      return 1;
    } else {
      return messageCount+1;
    }
  });
  if (message.user=="PERRINN") {return}
  admin.database().ref('appSettings/cost/').once('value').then(cost => {
    createTransaction (cost.val().message, event.params.team, "-L6XIigvAphrJr5w2jbf", message.user, "message cost");
  });
  if (message.action=="transaction") {
    return admin.database().ref('teamUsers/'+event.params.team+'/'+message.user).once('value').then((teamUser)=>{
      if (teamUser.val().leader) {
        createTransaction (message.amount, event.params.team, message.receiver, message.user, message.reference).then((result)=>{
          if (result) {
            createMessage (event.params.team,"PERRINN","You have sent "+message.amount+" COINS.","","confirmation");
            createMessage (message.receiver,"PERRINN","You have received "+message.amount+" COINS.","","confirmation");
            admin.database().ref('appSettings/cost/').once('value').then(cost => {
              createTransaction (cost.val().transaction, event.params.team, "-L6XIigvAphrJr5w2jbf", message.user, "transaction cost").then(()=>{
              });
            });
          }
        });
      } else {
        createMessage (event.params.team,"PERRINN","You need to be leader to send COINS.","","warning");
      }
    });
  }
});

exports.returnCOINS = functions.database.ref('tot').onCreate(event => {
  return admin.database().ref('PERRINNTeamBalance/').once('value').then(teams=>{
    var totalAmount = teams.child('-L6XIigvAphrJr5w2jbf').val().balance;
    teams.forEach(function(team){
      var amount = totalAmount/1000000*team.val().balance;
      if (team.key!="-KptHjRmuHZGsubRJTWJ") {
        createTransaction (amount,"-L6XIigvAphrJr5w2jbf",team.key,"PERRINN","return");
      }
    });
  });
});

exports.teamInformationLoop = functions.database.ref('toto').onCreate(event => {
  var leader="";
  var memberCount=0;
  return admin.database().ref('teams').once('value').then((teams)=>{
    teams.forEach(function(team){
      admin.database().ref('teamUsers/'+team.key).once('value').then((users)=>{
        users.forEach(function(user){
          if (user.val().leader) {
            leader=user.key;
          }
          if (user.val().member) {
            memberCount+=1;
          }
        });
        admin.database().ref('PERRINNTeams/'+team.key).update({
          name:team.val().name,
          photoURL:team.val().photoURL,
          leader:leader,
          memberCount:memberCount,
        });
        if (memberCount==1) {
          admin.database().ref('PERRINNUsers/'+leader).update({
            personalTeam:team.key,
          });
        }
        memberCount=0;
      });
    });
  });
});
