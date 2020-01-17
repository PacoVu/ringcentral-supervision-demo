require('dotenv').config()
const RingCentral = require('@ringcentral/sdk').SDK
var fs = require('fs')

const http = require('http');
var url = require('url');

http.createServer((request, response) => {
  console.log(`Request url: ${request.url}`);
  if (request.method === "POST"){
      if (request.url === "/webhookcallback") {
        if(request.headers.hasOwnProperty("validation-token")) {
            response.setHeader('Validation-Token', request.headers['validation-token']);
            response.statusCode = 200;
            response.end();
        }else{
          var body = []
          request.on('data', function(chunk) {
              body.push(chunk);
            }).on('end', function() {
              body = Buffer.concat(body).toString();
              var jsonObj = JSON.parse(body)
              for (var party of jsonObj.body.parties){
                console.log("Receive session notification")
                if (party.direction === "Inbound"){
                  if (party.status.code === "Proceeding"){
                    console.log("Ringing")
                    console.log(JSON.stringify(jsonObj.body))
                  }else if (party.status.code === "Answered"){
                    console.log("Answered")
                    console.log(JSON.stringify(jsonObj.body))
                    processTelephonySessionNotification(jsonObj.body)
                  }else if (party.status.code === "Disconnected"){
                    console.log("Hanged up")
                  }else
                    ; //console.log(JSON.stringify(jsonObj.body))
                  return
                }else
                  ; //console.log(JSON.stringify(jsonObj.body))
              }
            });
        }
      }
  }else{
      console.log("Not expecting other method...")
      response.writeHead(404);
      response.end();
  }
}).listen(5001, () => {
  console.log('Server running at http://127.0.0.1:5001/');
});

const rcsdk = new RingCentral({
  server: process.env.RINGCENTRAL_SERVER_URL,
  clientId: process.env.RINGCENTRAL_CLIENT_ID,
  clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
})

;(async () => {
  if (fs.existsSync("access_tokens.txt")) {
      console.log("reuse access tokens")
      var saved_tokens = fs.readFileSync("access_tokens.txt", 'utf8');
      var tokensObj = JSON.parse(saved_tokens)
      await rcsdk.platform().auth().setData(tokensObj)
      var isLoggedin = await rcsdk.platform().auth().accessTokenValid() //rcsdk.platform().loggedIn()
      console.log("everything is okay: " + isLoggedin)
      if (!isLoggedin){
        console.log("RELOGIN ???")
        await rcsdk.login({
          username: process.env.RINGCENTRAL_USERNAME,
          extension: process.env.RINGCENTRAL_EXTENSION,
          password: process.env.RINGCENTRAL_PASSWORD
        })
      }
  }else{
    await rcsdk.login({
      username: process.env.RINGCENTRAL_USERNAME,
      extension: process.env.RINGCENTRAL_EXTENSION,
      password: process.env.RINGCENTRAL_PASSWORD
    })
    const data = await rcsdk.platform().auth().data()
    fs.writeFile("access_tokens.txt", JSON.stringify(data), function(err) {
      if(err)
        console.log(err);
    })
  }
  /*
  await rcsdk.login({
    username: process.env.RINGCENTRAL_USERNAME,
    extension: process.env.RINGCENTRAL_EXTENSION,
    password: process.env.RINGCENTRAL_PASSWORD
  })
  const data = await rcsdk.platform().auth().data()
  fs.writeFile("access_tokens.txt", JSON.stringify(data), function(err) {
      if(err)
          console.log(err);
  })
  */

  // just for cleanup all pending/active subscriptions
  //return deleteAllRegisteredWebHookSubscriptions()

  fs.readFile('subscriptionId.txt', 'utf8', function (err, id) {
      if (err) {
        console.log("call startWebHookSubscription")
        startWebhookSubscription()
      }else{
        console.log("subscription id: " + id)
        checkRegisteredWebHookSubscription(id)
      }
  });
})()
/*
rcsdk.platform().login({
        username: process.env.RINGCENTRAL_USERNAME,
        extension: process.env.RINGCENTRAL_EXTENSION,
        password: process.env.RINGCENTRAL_PASSWORD
  })
  .then(function(resp){
    //save tokens
    console.log(resp)
    const data = await rcsdk.platform().auth().data()
    fs.writeFile("access_tokens.txt", JSON.stringify(data), function(err) {
        if(err)
            console.log(err);
    })
    //deleteAllRegisteredWebHookSubscriptions()
    //return
    fs.readFile('subscriptionId.txt', 'utf8', function (err, id) {
        if (err) {
          console.log("call startWebHookSubscription")
          startWebhookSubscription()
        }else{
          console.log("subscription id: " + id)
          checkRegisteredWebHookSubscription(id)
        }
    });
  })
  .catch(function(e) {
    console.error(e.toString());
  });
*/
async function processTelephonySessionNotification(body){
  var isLoggedin = await rcsdk.platform().loggedIn()
  console.log("still logged in?")
  if (!isLoggedin){
    console.log("RELOGIN ???")
    await rcsdk.login({
      username: process.env.RINGCENTRAL_USERNAME,
      extension: process.env.RINGCENTRAL_EXTENSION,
      password: process.env.RINGCENTRAL_PASSWORD
    })
  }
  var deviceId = fs.readFileSync('deviceId.txt', 'utf8')
  try{
      var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telephonySessionId}/supervise`
      var agentExtNumber = ""
      for (var agent of agentsList){
        if (agent.id == body.parties[0].extensionId){
          agentExtNumber = agent.number
        }
      }
      var params = {
            mode: 'Listen',
            supervisorDeviceId: deviceId,
            agentExtensionNumber: agentExtNumber
          }
      console.log(params)
      var res = await rcsdk.post(endpoint, params)
  }catch(e) {
      console.log(e.message)
      //console.log(e)
  }
}

var agentsList = []

async function startWebhookSubscription() {
    var r = await rcsdk.get('/restapi/v1.0/account/~/extension')
    var json = await r.json()
    //const agentExt = json.records.filter(ext => ext.extensionNumber === process.env.RINGCENTRAL_AGENT_EXT)[0]
    var eventFilters = []
    for (var record of json.records){
      if (record.extensionNumber == "120" || record.extensionNumber == "122"){
          var paramsEvent = `/restapi/v1.0/account/~/extension/${record.id}/telephony/sessions`
          eventFilters.push(paramsEvent)
          var agent = {
            id: record.id,
            number: record.extensionNumber
          }
          agentsList.push(agent)
      }
    }
    var res = await  rcsdk.post('/restapi/v1.0/subscription',
            {
                eventFilters: eventFilters,
                deliveryMode: {
                    transportType: 'WebHook',
                    address: process.env.DELIVERY_MODE_ADDRESS
                }
            })
    var jsonObj = await res.json()
    console.log("Ready to receive telephonyStatus notification via WebHook.")
    //console.log(JSON.stringify(jsonObj))
    //console.log(JSON.stringify(rcsdk.platform().auth().data()))
    try {
      fs.writeFile("subscriptionId.txt", jsonObj.id, function(err) {
          if(err)
              console.log(err);
          else
              console.log("SubscriptionId " + jsonObj.id + " is saved.");
      });
    }catch (e){
      console.log("WriteFile err")
    }
}

async function checkRegisteredWebHookSubscription(subscriptionId) {
    try {
      let response = await rcsdk.get('/restapi/v1.0/subscription')
      let json = await response.json();
      if (json.records.length > 0){
        for(var record of json.records) {
          if (record.id == subscriptionId) {
            if (record.deliveryMode.transportType == "WebHook"){
              if (process.env.DELETE_EXISTING_WEBHOOK_SUBSCRIPTION == 1){
                // Needed for local test as ngrok address might be expired
                console.log("Subscription exist => delete it then subscribe a new one")
                await rcsdk.delete('/restapi/v1.0/subscription/' + record.id)
                startWebhookSubscription()
              }else{
                if (record.status != "Active"){
                  console.log("Subscription is not active => renew it")
                  await rc.post('/restapi/v1.0/subscription/' + record.id + "/renew")
                  console.log("Renew: " + record.id)
                }else {
                  console.log("Subscription is active => good to go.")
                  console.log("sub status: " + record.status)
                }
              }
            }
          }
        }
      }else{
        console.log("No subscription for this service => create one.")
        startWebhookSubscription()
      }
    }catch(e){
      console.log("checkRegisteredWebHookSubscription ERROR")
      console.log(e)
    }
}

/// Clean up WebHook subscriptions
async function deleteAllRegisteredWebHookSubscriptions() {
  let response = await rcsdk.get('/restapi/v1.0/subscription')
  let json = await response.json();
  if (json.records.length > 0){
    for (var record of json.records) {
      if (record.deliveryMode.transportType == "WebHook"){
            // Needed for local test as ngrok address might be expired
          await rc.delete('/restapi/v1.0/subscription/' + record.id)
          console.log("Deleted")
      }
    }
  }else{
    console.log("No subscriptions.")
  }
}
