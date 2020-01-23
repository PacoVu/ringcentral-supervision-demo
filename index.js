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
  supervisor.initializePhoneEngine()
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
/*
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
*/

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

// Anything that doesn't match the above, send back the index.html file
app.get('*', (req, res) => {
  console.log("LOAD INDEX")
  res.sendFile(path.join(__dirname + '/client/build/index.html'))
  createTable((err, res) => {
      if (err) {
          console.log(err, res)
      }else{
          console.log("DONE")
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
            //if (jsonObj.subscriptionId == subscriptionId) {
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
            //}
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


function startNotification(){
  var query = "SELECT * from supervision_subscriptionids WHERE ext_id=1000012"
  pgdb.read(query, async (err, result) => {
      if (!err){
          if (result.rows.length){
              var row = result.rows[0]
              if (row['tokens'] != ""){
                var tokensObj = JSON.parse(row['tokens'])
                await rcsdk.platform().auth().setData(tokensObj)
                var isLoggedin = await rcsdk.platform().ensureLoggedIn()
                /*
                console.log("everything is okay: " + isLoggedin)
                if (!isLoggedin){
                  console.log("FORCE TO RELOGIN !!!")
                  await login(row['sub_id'])
                }
                */
              }else{
                await login(row['sub_id'])
              }
              if (row['sub_id'] != ""){
                console.log("checkRegisteredSubscription")
                //checkRegisteredSubscription(thisUser, null, row['sub_id'])
                checkRegisteredWebHookSubscription(row['sub_id'])
              }else{
                console.log("empty sub id => call startWebHookSubscription")
                startWebhookSubscription()
              }
          }else{
              console.log("no row => call startWebHookSubscription")
              console.log("FORCE TO LOGIN !!!")
              await login("")
              startWebhookSubscription()
          }
      }
  })
}
  // just for cleanup all pending/active subscriptions
  //return deleteAllRegisteredWebHookSubscriptions()

async function login(subId){
  console.log("FORCE TO LOGIN !!!")
  try{
    await rcsdk.login({
      username: process.env.RINGCENTRAL_USERNAME,
      extension: process.env.RINGCENTRAL_EXTENSION,
      password: process.env.RINGCENTRAL_PASSWORD
    })
    console.log("after login")
    const data = await rcsdk.platform().auth().data()
    //console.log(JSON.stringify(data))
    storeTokens(subId, JSON.stringify(data), (err, result) => {
      if(err)
        console.log(err);
      else
        console.log("Loggged in")
    })
  }catch(e){
    console.log("LOGIN FAILED")
  }
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
        // add partyId to the agent list

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

async function readExtensions() {
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
    return eventFilters
}

async function startWebhookSubscription() {
    var eventFilters = await readExtensions()
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
    subscriptionId = jsonObj.id
    storeSubscriptionId(jsonObj.id)
    /*
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
    */
}

function storeTokens(subId, tokens, callback){
  console.log("storeTokens")
    var query = "INSERT INTO supervision_subscriptionids (ext_id, sub_id, tokens)"
    query += " VALUES ($1, $2, $3)"
    var values = ["1000012", subId, tokens]
    query += " ON CONFLICT (ext_id) DO UPDATE SET tokens = '" + tokens + "'"
    console.log("SUB ID: " + query)
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
    var query = "INSERT INTO supervision_subscriptionids (ext_id, sub_id)"
    query += " VALUES ($1, $2)"
    var values = ["1000012", subId]
    query += " ON CONFLICT (ext_id) DO UPDATE SET sub_id = '" + subId + "'"
    console.log("SUB ID: " + query)
    pgdb.insert(query, values, (err, result) =>  {
      if (err){
        console.error(err.message);
      }
      console.log("save sub_id")
    })
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
                await readExtensions()
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
