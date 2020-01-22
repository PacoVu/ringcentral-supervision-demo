const express = require('express')
const cors = require('cors')
const path = require('path')
const pgdb = require('./db')

const RingCentral = require('@ringcentral/sdk').SDK
var fs = require('fs')

// Create the server
const app = express()

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, 'client/build')))

// SoftPhone
if (process.env.PRODUCTION == false)
  require('dotenv').config()

const PhoneEngine = require('./supervisor-engine');

var supervisorArr = []
var eventResponse = null
var subscriptionId = ""

// Serve our api route /cow that returns a custom talking text cow
app.get('/events', cors(), async (req, res) => {
  console.log("METHOD EVENTS")
  res.set({
    'Connection': 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });
  res.statusCode = 200;
  eventResponse = res
})

app.get('/enable_translation', cors(), async (req, res) => {
  /*
  console.log("START NOTIFICATION")
  startNotification()
  res.statusCode = 200;
  res.end();
  */
  console.log("ENABLE TRANSLATION")
  var queryData = req.query;
  console.log(queryData.enable)

  for (var supervisor of supervisorArr){
    if (supervisor.name == queryData.agent){
      supervisor.engine.enableTranslation(queryData.enable)
      break
    }
  }

  res.statusCode = 200;
  res.end();
})

app.get('/supervise', cors(), async (req, res) => {
    console.log("ENABLE SUPERVISION")
    var queryData = req.query;
    console.log(queryData.agent)
    let supervisor = new PhoneEngine(queryData.agent)
    supervisor.initializePhoneEngine()
    var agent = {
          name: queryData.agent,
          engine: supervisor
    }
    supervisorArr.push(agent)

    res.statusCode = 200;
    res.end();
})
/*
app.get('/startnotification', cors(), async (req, res) => {
  console.log("START NOTIFICATION")
  var queryData = req.query;
  console.log(queryData.enable)

  startNotification()
  res.statusCode = 200;
  res.end();
})
*/

app.get('/recording', cors(), async (req, res) => {
  console.log("ENABLE RECORDING")
  var queryData = req.query;
  console.log(queryData.enable)

  for (var supervisor of supervisorArr){
    if (supervisor.name == queryData.agent){
      supervisor.engine.enableRecording(queryData.enable)
      break
    }
  }
  res.statusCode = 200;
  res.end();
})

// Anything that doesn't match the above, send back the index.html file
app.get('*', async (req, res) => {
  //res.sendFile(path.join(__dirname + '/client/build/index.html'))
  //console.log("START NOTIFICATION")
  //startNotification()
  await rcsdk.login({
    username: process.env.RINGCENTRAL_USERNAME,
    extension: process.env.RINGCENTRAL_EXTENSION,
    password: process.env.RINGCENTRAL_PASSWORD
  })
  var authorize_uri = await rcsdk.platform().loginUrl({brandId: ''})
  res.set('Content-Type', 'text/html');
  var html = '<h2>Login</h2>'
  html += '<a href="' + authorize_uri + '">Login RingCentral Account</a>'
  res.send(new Buffer(html));
  res.end();
})

/* LOGIN
app.get('/logout', function(req, res) {
  if (req.session.tokens != undefined){
      var tokensObj = req.session.tokens
      var platform = rcsdk.platform()
      platform.auth().setData(tokensObj)
      platform.loggedIn().then(function(isLoggedIn) {
        if (isLoggedIn) {
          platform.logout()
            .then(function(resp){
                console.log("logged out")
            })
            .catch(function(e){
                console.log(e)
            });
        }
        req.session.tokens = null
        res.redirect("/")
      });
      return
  }
  res.redirect("/")
})

app.get('/oauth2callback', function(req, res) {
  if (req.query.code) {
      var platform = rcsdk.platform()
      platform.login({
          code: req.query.code,
      })
      .then(function(response) {
        return response.json()
      })
      .then(function (token) {
          req.session.tokens = token
          res.redirect("/test")
      })
      .catch(function (e) {
          res.send('Login error ' + e)
      });
  }else {
      res.send('No Auth code');
  }
});
*/

app.post('/webhookcallback', function(req, res) {
  console.log("webhookcallback called")
  //console.log(req)
    if(req.headers.hasOwnProperty("validation-token")) {
        res.setHeader('Validation-Token', req.headers['validation-token']);
        res.statusCode = 200;
        res.end();
    }else{
        var body = []
        req.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            body = Buffer.concat(body).toString();
            var jsonObj = JSON.parse(body)
            if (jsonObj.subscriptionId == subscriptionId) {
              for (var party of jsonObj.body.parties){
                  console.log("Receive session notification")
                  if (party.direction === "Inbound"){
                    if (party.status.code === "Proceeding"){
                      console.log("RINGING " + JSON.stringify(jsonObj.body))
                      var agentExtNumber = ""
                      for (var agent of agentsList){
                        if (agent.id == party.extensionId){
                          agentExtNumber = agent.number
                        }
                      }
                      var phoneStatus = {
                        agent: agentExtNumber,
                        status: 'ringing'
                      }
                      sendPhoneEvent(phoneStatus)
                    }else if (party.status.code === "Answered"){
                      processTelephonySessionNotification(jsonObj.body)
                    }else if (party.status.code === "Disconnected"){
                      var agentExtNumber = ""
                      for (var agent of agentsList){
                        if (agent.id == party.extensionId){
                          agentExtNumber = agent.number
                        }
                      }
                      var phoneStatus = {
                        agent: agentExtNumber,
                        status: 'idle'
                      }
                      sendPhoneEvent(phoneStatus)
                      console.log("HANG UP " + JSON.stringify(jsonObj.body))
                      /*
                      for (var supervisor of supervisorArr){
                        if (supervisor.name == agentExtNumber){
                          supervisor.engine.hangup()
                          break
                        }
                      }
                      */
                    }else
                      console.log(JSON.stringify(jsonObj.body))
                    return
                  }else
                    console.log(JSON.stringify(jsonObj.body))
              }
              res.statusCode = 200;
              res.end();
            }
        });
    }
})


// Choose the port and start the server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Mixing it up on port ${PORT}`)
})



function sendPhoneEvent(phone){
  var res = 'event: phoneEvent\ndata: ' + JSON.stringify(phone) + '\n\n'
  console.log("sendPhoneEvent: " + res)
  if (!eventResponse.finished) {
      eventResponse.write(res);
  }
  //if (phone.status == "connected")
  //  eventHistory = []
}

function sendTranscriptEvents(transcript) {
  var t = JSON.stringify(transcript)
  console.log(t)
  var res = 'event: transcriptUpdate\ndata: ' + t + '\n\n'
  if (!eventResponse.finished) {
      eventResponse.write(res);
  }
  //if (transcript.status)
  //  eventHistory.push(transcript);
}

function closeConnection(response) {
  if (!response.finished) {
    response.end();
    //console.log('Stopped sending events.');
  }
}

function checkConnectionToRestore(request, response, eventHistory) {
  if (request.headers['last-event-id']) {
    const eventId = parseInt(request.headers['last-event-id']);
    eventsToReSend = eventHistory.filter((e) => e.id > eventId);
    eventsToReSend.forEach((e) => {
      if (!response.finished) {
        response.write(e);
      }
    });
  }
}

module.exports.sendTranscriptEvents = sendTranscriptEvents;
module.exports.sendPhoneEvent = sendPhoneEvent;

const rcsdk = new RingCentral({
  server: process.env.RINGCENTRAL_SERVER_URL,
  clientId: process.env.RINGCENTRAL_CLIENT_ID,
  clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
})

async function startNotification(){
  /*
  createTable("subscriptionids", "subscriptionids", function(err, res){
      if (err)
          console.log("create table failed")
      else{
        console.log("subscriptionids table created")
        var query = "SELECT sub_id from vva_users WHERE ext_id=" + extId
            var thisUser = this
            pgdb.read(query, (err, result) => {
                if (!err){
                  var row = result.rows[0]
                  if (row['sub_id'] != ""){
                    console.log("checkRegisteredSubscription")
                    checkRegisteredSubscription(thisUser, null, row['sub_id'])
                  }
                }
            });
      }
  })
  */
  if (fs.existsSync("access_tokens.txt")) {
      console.log("reuse access tokens")
      var saved_tokens = fs.readFileSync("access_tokens.txt", 'utf8');
      var tokensObj = JSON.parse(saved_tokens)
      await rcsdk.platform().auth().setData(tokensObj)
      var isLoggedin = await rcsdk.platform().auth().accessTokenValid()
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

  // just for cleanup all pending/active subscriptions
  return deleteAllRegisteredWebHookSubscriptions()

  fs.readFile('subscriptionId.txt', 'utf8', function (err, id) {
      if (err) {
        console.log("call startWebHookSubscription")
        startWebhookSubscription()
      }else{
        console.log("subscription id: " + id)
        checkRegisteredWebHookSubscription(id)
      }
  });
}

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
  try {
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
  }catch(e){
    console.log(e.message)
  }
}

var agentsList = []

async function startWebhookSubscription() {
    var r = await rcsdk.get('/restapi/v1.0/account/~/extension')
    var json = await r.json()
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
          else {
              console.log("SubscriptionId " + jsonObj.id + " is saved.");
              subscriptionId = jsonObj.id
          }
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
          await rcsdk.delete('/restapi/v1.0/subscription/' + record.id)
          console.log("Deleted")
      }
    }
    console.log("Deleted all")
    startWebhookSubscription()
  }else{
    console.log("No subscription for this service => create one.")
    startWebhookSubscription()
  }
}
