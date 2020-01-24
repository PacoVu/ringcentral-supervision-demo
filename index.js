const express = require('express')
const cors = require('cors')
const path = require('path')
const pgdb = require('./db')
var fs = require('fs')

const RingCentral = require('@ringcentral/sdk').SDK

// Create the server
const app = express()

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, 'client/build')))

// SoftPhone
if (process.env.PRODUCTION == false)
  require('dotenv').config()

const PhoneEngine = require('./supervisor-engine');

let supervisor = new PhoneEngine()
var eventResponse = null
var g_subscriptionId = ""

// Serve our api route /cow that returns a custom talking text cow
app.get('/events', cors(), async (req, res) => {
  console.log("METHOD EVENTS")
  res.set({
    'Connection': 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });

  loadSavedTokens(supervisorExtensionId, async function(err, res){
    if (err){
      console.log("FORCE TO LOGIN !!!")
      await login()
      supervisor.initializePhoneEngine(rcsdk)
    }else{
      supervisor.initializePhoneEngine(rcsdk)
    }
  })

  //supervisor.initializePhoneEngine()
  res.statusCode = 200;
  eventResponse = res
})

app.get('/enable_translation', cors(), async (req, res) => {
  console.log("ENABLE TRANSLATION")
  var queryData = req.query;
  console.log(queryData.enable)
  supervisor.enableTranslation(queryData.agent, queryData.enable)
  res.statusCode = 200;
  res.end();
})

app.get('/supervise', cors(), async (req, res) => {
    console.log("ENABLE SUPERVISION")
    var queryData = req.query;
    console.log(queryData.agent)
    //supervisor.initializePhoneEngine()
    var agent = {
      number: queryData.agent
    }
    agentsList.push(agent)
    res.statusCode = 200;
    res.end();
})

app.get('/recording', cors(), async (req, res) => {
  console.log("ENABLE RECORDING")
  var queryData = req.query;
  console.log(queryData.enable)
  supervisor.enableRecording(queryData.agent, queryData.enable)
  res.statusCode = 200;
  res.end();
})

app.get('/login', cors(), (req, res) => {
  console.log("LOGIN")
  startNotification()
  res.statusCode = 200;
  res.end();
})

app.get('/logout', cors(), async (req, res) => {
  console.log("LOGOUT")
  await logout()
  res.statusCode = 200;
  res.end();
})

// Anything that doesn't match the above, send back the index.html file
app.get('*', (req, res) => {
  console.log("LOAD INDEX")
  res.sendFile(path.join(__dirname + '/client/build/index.html'))
  createTable((err, res) => {
      console.log(res)
      if (err) {
          console.log(err, res)
      }else{
          console.log("DONE => login")
          login()
      }
  });

  //startNotification()
  /*
  var authorize_uri = rcsdk.platform().loginUrl({brandId: ''})
  res.set('Content-Type', 'text/html');
  var html = '<h2>Login</h2>'
  html += '<a href="' + authorize_uri + '">Login RingCentral Account</a>'
  console.log(html)
  */
/*
  console.log("LOAD LOGIN")

  //startNotification()
  var authorize_uri = rcsdk.platform().loginUrl({brandId: ''})
  res.set('Content-Type', 'text/html');
  var html = '<h2>Login</h2>'
  html += '<a href="' + authorize_uri + '">Login RingCentral Account</a>'
  console.log(html)
  //res.sendFile(path.join(__dirname + '/client/build/login.html'))
  res.send(new Buffer.from(html));
  //res.end();
*/
})

app.get('/oauth2callback', async function(req, res) {
  console.log("oauth2callback")
  console.log(req.query.code)
  if (req.query.code) {
      var platform = rcsdk.platform()
      await platform.login({
          code: req.query.code,
      })
      const data = await rcsdk.platform().auth().data()
      console.log(JSON.stringify(data));
      fs.writeFile("access_tokens.txt", JSON.stringify(data), function(err) {
        if(err)
          console.log(err);
      })
      res.send("logged in")
  }else {
      res.send('No Auth code');
  }
});


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
            console.log("g_sub: " + g_subscriptionId)
            console.log("not sub: " + jsonObj.subscriptionId)
            if (jsonObj.subscriptionId == g_subscriptionId) {
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
  }else{
    console.log("eventResponse is finished")
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

async function getRCSDK(){
  await loadSavedTokens(supervisorExtensionId, async function(err, res){
    if (err){
      console.log("no row => call startWebHookSubscription")
      console.log("FORCE TO LOGIN !!!")
      await login()
      // just for cleanup all pending/active subscriptions
      //return deleteAllRegisteredWebHookSubscriptions()
      return rcsdk
    }else{
      console.log("sdk is good")
      return rcsdk
    }
  })
}
module.exports.getRCSDK = getRCSDK;


async function loadSavedTokens(extId, callback){
  var query = "SELECT tokens from supervision_subscriptionids WHERE ext_id=" + extId
  pgdb.read(query, async (err, result) => {
      if (!err){
          if (result.rows.length){
              var row = result.rows[0]
              if (row['tokens'] != ""){
                var tokensObj = JSON.parse(row['tokens'])
                await rcsdk.platform().auth().setData(tokensObj)
                rcsdk.ensureLoggedIn()
                .then(function(res){
                  console.log(res)
                  callback(null, "ok")
                })
                .catch(function(e){
                  console.log(e.message)
                  callback(e, "")
                });
              }else{
                callback("err", "")
              }
          }else{
              console.log("no row => call startWebHookSubscription")
              callback("err", "")
          }
      }
  })
}

async function loadSavedSubscriptionId(extId, callback){
  var query = "SELECT sub_id from supervision_subscriptionids WHERE ext_id=" + extId
  pgdb.read(query, async (err, result) => {
      if (!err){
          if (result.rows.length){
              var row = result.rows[0]
              if (row['sub_id'] != ""){
                console.log("has subId => call checkRegisteredWebHookSubscription")
                callback(null, row['sub_id'])
              }else{
                console.log("subId empty => call startWebHookSubscription")
                callback("err", "")
              }
          }else{
              console.log("no subId => call startWebHookSubscription")
              callback("err", "")
          }
      }
  })
}

function startNotification(){
  console.log(supervisorExtensionId)
  loadSavedTokens(supervisorExtensionId, async function(err, res){
    if (err){
      console.log("no row => call startWebHookSubscription")
      console.log("FORCE TO LOGIN !!!")
      await login()
      // just for cleanup all pending/active subscriptions
      //return deleteAllRegisteredWebHookSubscriptions()
      //startWebhookSubscription()
    }else{
      loadSavedSubscriptionId(supervisorExtensionId, async function(err, res){
        if (err){
          startWebhookSubscription()
        }else{
          console.log("saved subId: " + res)
          // just for cleanup all pending/active subscriptions
          //return deleteAllRegisteredWebHookSubscriptions()
          checkRegisteredWebHookSubscription(res)
        }
      })
    }
  })
}

var platform = rcsdk.platform();

platform.on(platform.events.refreshError, function(e){
    console.log("Refresh token failed")
});

platform.on(platform.events.refreshSuccess, async function(res){
    console.log("Refresh token success")
    console.log(res)
    const data = await rcsdk.platform().auth().data()
    //console.log(JSON.stringify(data))
    storeTokens(supervisorExtensionId, JSON.stringify(data), (err, result) => {
      if(err)
        console.log(err);
      else
        console.log("refreshSuccess ok")
    })
});


async function login(){
  console.log("FORCE TO LOGIN !!!")
  try{
    await rcsdk.login({
      username: process.env.RINGCENTRAL_USERNAME,
      extension: process.env.RINGCENTRAL_EXTENSION,
      password: process.env.RINGCENTRAL_PASSWORD
    })
    console.log("after login")
    readExtensions()
  }catch(e){
    console.log("LOGIN FAILED")
  }
}

async function logout(){
  var query = "SELECT tokens from supervision_subscriptionids WHERE ext_id=" + supervisorExtensionId
  pgdb.read(query, async (err, result) => {
      if (!err){
          if (result.rows.length){
              var row = result.rows[0]
              if (row['tokens'] != ""){
                var tokensObj = JSON.parse(row['tokens'])
                await rcsdk.platform().auth().setData(tokensObj)
                await rcsdk.platform().logout()
              }
          }
      }
      query = "UPDATE supervision_subscriptionids SET tokens='' WHERE ext_id=" + supervisorExtensionId
      pgdb.update(query, (err, result) =>  {
        if (err){
          console.error(err.message);
        }
        console.log("reset tokens")
      })
  })
}

function createTable(callback){
  pgdb.create_table("supervision_subscriptionids", "supervision_subscriptionids", (err, res) => {
      if (err) {
          console.log(err, res)
          callback(err, null)
      }else{
          callback(null, "done")
      }
  })
}

async function processTelephonySessionNotification(body){
  rcsdk.ensureLoggedIn()
  .then(function(res){
    console.log(res)
  })
  .catch(function(e){
    console.log(e.message)
  });
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
        supervisor.setAgent(agentExtNumber, body.telephonySessionId)
        var params = {
              mode: 'Listen',
              supervisorDeviceId: deviceId,
              agentExtensionNumber: agentExtNumber
            }
        console.log(params)
        var res = await rcsdk.post(endpoint, params)
    }catch(e) {
      console.log("POST supervise failed")
        console.log(e.message)
        console.log(e)
    }
  }catch(e){
    console.log(e.message)
  }
}

var agentsList = []
var testAgent = ["120","122"]
var supervisorExtensionId = ""

async function readExtensions() {
    var r = await rcsdk.get('/restapi/v1.0/account/~/extension')
    var json = await r.json()
    var eventFilters = []
    for (var record of json.records){
      for (var a of testAgent){
        if (record.extensionNumber == a){
            var agent = {
              id: record.id,
              number: record.extensionNumber
            }
            agentsList.push(agent)
            break
        }
        if (record.extensionNumber == "119")
          supervisorExtensionId = record.id
      }
    }
    const data = await rcsdk.platform().auth().data()
    storeTokens(supervisorExtensionId, JSON.stringify(data), (err, result) => {
      console.log(result)
    })
}

function createNotificationFilters(){
  var eventFilters = []
  for (var agent of agentsList){
    var paramsEvent = `/restapi/v1.0/account/~/extension/${agent.id}/telephony/sessions`
    eventFilters.push(paramsEvent)
  }
  return eventFilters
}

async function startWebhookSubscription() {
    var eventFilters = createNotificationFilters()
    if (eventFilters.length > 0){
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
      g_subscriptionId = jsonObj.id
      storeSubscriptionId(jsonObj.id)
    }else{
      console.log("no extensions => eed to read extension then retry")
    }
}

function storeTokens(extId, tokens, callback){
    console.log("storeTokens")
    var query = "INSERT INTO supervision_subscriptionids (ext_id, sub_id, tokens)"
    query += " VALUES ($1, $2, $3)"
    var values = [extId, "", tokens]
    query += " ON CONFLICT (ext_id) DO UPDATE SET tokens = '" + tokens + "'"
    pgdb.insert(query, values, (err, result) =>  {
      if (err){
        console.error(err.message);
        callback(err, null)
      }
      console.log("save tokens")
      callback(null, "done")
    })
}

function storeSubscriptionId(subId){
    query = "UPDATE supervision_subscriptionids SET sub_id='" + subId + "' WHERE ext_id=" + supervisorExtensionId
    pgdb.update(query, (err, result) =>  {
      if (err){
        console.error(err.message);
      }
      console.log("save sub_id")
    })
}

async function checkRegisteredWebHookSubscription(subscriptionId) {
  console.log("subId: " + subscriptionId)
    try {
      let response = await rcsdk.get('/restapi/v1.0/subscription')
      let json = await response.json();
      if (json.records.length > 0){
        for(var record of json.records) {
          console.log("found id: " + record.id)
          if (record.id == subscriptionId) {
            if (record.deliveryMode.transportType == "WebHook"){
              if (process.env.DELETE_EXISTING_WEBHOOK_SUBSCRIPTION == 1){
                // Needed for local test as ngrok address might be expired
                console.log("Subscription exist => delete it then subscribe a new one")
                await rcsdk.delete('/restapi/v1.0/subscription/' + record.id)
                startWebhookSubscription()
              }else{
                await readExtensions()
                g_subscriptionId = subscriptionId
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
      login()
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
    //startWebhookSubscription()
  }else{
    console.log("No subscription for this service => create one.")
    //startWebhookSubscription()
  }
}
