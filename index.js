const express = require('express')
const cors = require('cors')
const path = require('path')
const pgdb = require('./db')
const async = require('async')
var fs = require('fs')

const RingCentral = require('@ringcentral/sdk').SDK

// Test params
var agentsList = []
//var testAgent = ["120","122"]
var testCustomerLanguage = [
  { number: "+16505130930", language: "english" },
  { number: "+16504306662", language: "chinese" },
  { number: "+16502245476", language: "english" }
]
var supervisorExtensionId = ""

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

createTable((err, res) => {
    console.log(res)
    if (err) {
        console.log(err, res)
    }else{
        console.log("DONE => login")
    }
});

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
  /*
  for (var agent of agentsList){
    var phoneStatus = {
      agent: agent.number,
      status: 'ready'
    }
    sendPhoneEvent(phoneStatus)
  }
  */
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
/*
app.get('/login', cors(), (req, res) => {
  console.log("LOGIN")
  startNotification()
  //login()
  res.statusCode = 200;
  res.end();
})
*/
app.get('/delete_subscriptions', cors(), async (req, res) => {
  console.log("DELETE ALL SUBs")
  deleteAllRegisteredWebHookSubscriptions()
  res.statusCode = 200;
  res.end();
})

// Anything that doesn't match the above, send back the index.html file
app.get('*', cors(), (req, res) => {
  console.log("LOAD INDEX")
  res.set({
    'Connection': 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });
  res.sendFile(path.join(__dirname + '/client/build/index.html'))
  login()
})

/* NOT USED
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
*/
// Receiving RingCentral webhooks notifications
app.post('/webhookcallback', function(req, res) {
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
            if (jsonObj.subscriptionId == g_subscriptionId) {
              for (var party of jsonObj.body.parties){
                  console.log("Receive session notification")
                  if (party.direction === "Inbound"){
                    if (party.status.code === "Proceeding"){
                      console.log("RINGING ...")
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
                      console.log("INBOUND NOT => AGENT")
                      //console.log(JSON.stringify(jsonObj.body))
                      for (var agent of agentsList){
                        if (agent.id == party.extensionId){
                          getCallSessionInfo(agent.number, jsonObj)
                          break
                        }
                      }

                      /*
                      var agentExtNumber = ""
                      for (var agent of agentsList){
                        if (agent.id == party.extensionId){
                          agentExtNumber = agent.number
                        }
                      }
                      var params = {
                        ownerId: jsonObj.ownerId,
                        telSessionId: jsonObj.body.telephonySessionId,
                        partyId: jsonObj.body.parties[0].id,
                        extensionId: jsonObj.body.parties[0].extensionId,
                        agentExtNumber: agentExtNumber,
                        speakerId: jsonObj.body.parties[0].to.name
                      }
                      //processTelephonySessionNotification(params)
                      */
                    }else if (party.status.code === "Disconnected"){
                      for (var agent of agentsList){
                        if (agent.id == party.extensionId){
                          var agentExtNumber = agent.number
                          var phoneStatus = {
                            agent: agentExtNumber,
                            status: 'idle'
                          }
                          sendPhoneEvent(phoneStatus)
                          break
                        }
                      }
                      console.log("HANG UP " + party.status.code)
                    }else
                      console.log(party.status.code)
                    //return
                  }else if (party.direction === "Outbound"){
                    //console.log("OUTBOUND NOT => SUPERVISOR")
                    //console.log(JSON.stringify(jsonObj))
                  }
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
  if (eventResponse != null){
    if (!eventResponse.finished) {
        eventResponse.write(res);
    }else{
      console.log("eventResponse is finished")
    }
  }else{
    console.log("eventResponse is null")
  }
  //if (phone.status == "connected")
  //  eventHistory = []
}

function mergingChannels(speakerId, transcript){
  var agentIndex = 0
  for (agentIndex; agentIndex<agentsList.length; agentIndex++){
    agent = agentsList[agentIndex]
    if (agent.number == transcript.agent)
      break
  }
  if (speakerId == 0){ // customer
    for (let i = 0; i < agentsList[agentIndex].mergedTranscription.customer.length; i++) {
      if (agentsList[agentIndex].mergedTranscription.customer[i].index === transcript.index){
        transcript.index = agentsList[agentIndex].mergedTranscription.index
        return sendTranscriptEvents(transcript)
      }
    }
    agentsList[agentIndex].mergedTranscription.index++
    var item = {
      index: transcript.index,
      text: transcript.text
    }
    agentsList[agentIndex].mergedTranscription.customer.push(item)
    transcript.index = agentsList[agentIndex].mergedTranscription.index
    sendTranscriptEvents(transcript)
  }else{ // agent
    for (let i = 0; i < agentsList[agentIndex].mergedTranscription.agent.length; i++) {
      if (agentsList[agentIndex].mergedTranscription.agent[i].index === transcript.index){
        transcript.index = agentsList[agentIndex].mergedTranscription.index
        return sendTranscriptEvents(transcript)
      }
    }
    agentsList[agentIndex].mergedTranscription.index++
    var item = {
      index: transcript.index,
      text: transcript.text
    }
    agentsList[agentIndex].mergedTranscription.agent.push(item)
    transcript.index = agentsList[agentIndex].mergedTranscription.index
    sendTranscriptEvents(transcript)
  }
}

function sendTranscriptEvents(transcript) {
  var t = JSON.stringify(transcript)
  //console.log(t)
  var res = 'event: transcriptUpdate\ndata: ' + t + '\n\n'
  if (eventResponse != null){
    if (!eventResponse.finished) {
        eventResponse.write(res);
    }else{
      console.log("eventResponse is finished")
    }
  }else{
    console.log("eventResponse is null")
  }
  //if (transcript.status)
  //  eventHistory.push(transcript);
}

function sendAnalyticsEvents(analytics) {
  var a = JSON.stringify(analytics)
  //console.log(a)
  var res = 'event: analyticsEvent\ndata: ' + t + '\n\n'
  if (eventResponse != null){
    if (!eventResponse.finished) {
        eventResponse.write(res);
    }else{
      console.log("eventResponse is finished")
    }
  }else{
    console.log("eventResponse is null")
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

module.exports.mergingChannels = mergingChannels;
module.exports.sendAnalyticsEvents = sendAnalyticsEvents;
module.exports.sendPhoneEvent = sendPhoneEvent;

const rcsdk = new RingCentral({
  server: process.env.RINGCENTRAL_SERVER_URL,
  clientId: process.env.RINGCENTRAL_CLIENT_ID,
  clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
})


async function readDeviceId(extId, callback){
  var query = "SELECT device_id from supervision_subscriptionids WHERE ext_id=" + extId
  pgdb.read(query, async (err, result) => {
      if (!err){
          if (result.rows.length){
              var row = result.rows[0]
              if (row['device_id'] != ""){
                callback(null, row['device_id'])
              }else{
                callback("err", "")
              }
          }else{
              console.log("no subId => call startWebHookSubscription")
              callback("err", "")
          }
      }else{
        callback("err", "")
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
  console.log("startNotification function")
  //return deleteAllRegisteredWebHookSubscriptions()
  console.log(supervisorExtensionId)
  loadSavedSubscriptionId(supervisorExtensionId, async function(err, res){
      if (err){
          startWebhookSubscription()
      }else{
          console.log("saved subId: " + res)
          checkRegisteredWebHookSubscription(res)
      }
  })
}

var platform = rcsdk.platform();

platform.on(platform.events.loginSuccess, async function(e){
  console.log("Login success")
  //startNotification()
  //const data = await rcsdk.platform().auth().data()
  //console.log(JSON.stringify(data))
  //supervisor.initializePhoneEngine(rcsdk, supervisorExtensionId)
  /*
  storeTokens(supervisorExtensionId, JSON.stringify(data), (err, result) => {
    console.log(result)
  })
  */
});

platform.on(platform.events.refreshError, function(e){
    console.log("Refresh token failed")
    //login()
});

platform.on(platform.events.refreshSuccess, async function(res){
    console.log("Refresh token success")
    //const data = await rcsdk.platform().auth().data()
    //console.log(JSON.stringify(data))
});

async function login(){
  var loggedIn = await rcsdk.platform().loggedIn()
  if (!loggedIn){
    console.log("FORCE TO LOGIN !!!")
    try{
      await rcsdk.login({
        username: process.env.RINGCENTRAL_USERNAME,
        extension: process.env.RINGCENTRAL_EXTENSION,
        password: process.env.RINGCENTRAL_PASSWORD
      })
      console.log("New login")
    }catch(e){
      console.log("LOGIN FAILED")
      return
    }
  }else{
    console.log("Still logged in => good to call APIs")
  }
  await readCallMonitoringGroup()
  //await readExtensions()
  console.log("after read extension")
  supervisor.initializePhoneEngine(rcsdk, supervisorExtensionId)
  startNotification()
}

async function logout(){
  if (supervisorExtensionId != ""){
    var query = "SELECT sub_id from supervision_subscriptionids WHERE ext_id=" + supervisorExtensionId
    pgdb.read(query, async (err, result) => {
      if (!err){
          if (result.rows.length){
              var row = result.rows[0]
              if (row['sub_id'] != ""){
                deleteRegisteredWebHookSubscription(row['sub_id'], async function(err, res){
                  await rcsdk.platform().logout()
                  query = "UPDATE supervision_subscriptionids SET tokens='', sub_id='' WHERE ext_id=" + supervisorExtensionId
                  pgdb.update(query, (err, result) =>  {
                    if (err){
                      console.error(err.message);
                    }
                    console.log("reset subscription")
                  })
                  return
                })
              }
          }
      }
    })
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

async function getCallSessionInfo(agentExtNumber, payload){
  console.log("getCallSessionInfo")
  var body = payload.body
  var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telephonySessionId}`
  var res = await rcsdk.get(endpoint)
  var json = await res.json()
  //console.log(JSON.stringify(json));
  // reset previous conversations
  var agentIndex = 0
  for (agentIndex; agentIndex<agentsList.length; agentIndex++){
    agent = agentsList[agentIndex]
    if (agent.number == agentExtNumber)
      break
  }
  agentsList[agentIndex].mergedTranscription.index = -1
  agentsList[agentIndex].mergedTranscription.customer = []
  agentsList[agentIndex].mergedTranscription.agent = []

  async.each(json.parties,
      function(party, callback){
        var params = {
          ownerId: payload.ownerId,
          telSessionId: json.id,
        }
        if (party.direction == "Outbound"){
            params['partyId'] = party.id
            params['extensionId'] = agentsList[agentIndex].id.toString() //party.to.extensionId
            params['agentExtNumber'] = agentExtNumber
            params['speakerName'] = (party.from.name) ? party.from.name : "Customer"
            params['speakerId'] = 0 // a customer
            params['language'] = "english"
            for (var customer of testCustomerLanguage){
              if (customer.number == party.from.phoneNumber){
                params['language'] = customer.language
              }
            }
            processTelephonySessionNotification(params)
        }else{
          if (party.extensionId == agentsList[agentIndex].id.toString()){
            params['partyId'] = party.id
            params['extensionId'] = agentsList[agentIndex].id.toString() //party.to.extensionId
            params['agentExtNumber'] = agentExtNumber
            params['speakerName'] = (party.to.name) ? party.to.name : "Agent"
            params['speakerId'] = 1 // an agent
            params['language'] = "english"
            processTelephonySessionNotification(params)
          }
        }
        callback(null, "")
      },
      function(err){
        console.log("done")
      }
    );
}
async function processTelephonySessionNotification(inputParams){
  //console.log(inputParams)
  readDeviceId(inputParams.ownerId, async function (err, deviceId){
    if (!err){
      try{
          //var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telephonySessionId}/supervise`
          var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${inputParams.telSessionId}/parties/${inputParams.partyId}/supervise`
          //console.log(endpoint)
          var agentObj = {}
            agentObj['agentExtNumber'] = inputParams.agentExtNumber
            agentObj['speakerName'] = inputParams.speakerName
            agentObj['sessionId'] = inputParams.telSessionId
            agentObj['partyId'] = inputParams.partyId
            agentObj['speakerId'] = inputParams.speakerId
            agentObj['language'] = inputParams.language

          supervisor.setAgent(agentObj)
          var params = {
                mode: 'Listen',
                supervisorDeviceId: deviceId
              }
          params['agentExtensionId'] = inputParams.extensionId
          //console.log(params)
          var res = await rcsdk.post(endpoint, params)
      }catch(e) {
        console.log("POST supervise failed")
          console.log(e.message)
          //console.log(e.response)
      }
    }
  })
}

async function readExtensions() {
    var r = await rcsdk.get('/restapi/v1.0/account/~/extension')
    var json = await r.json()
    var eventFilters = []
    agentsList = []
    for (var record of json.records){
      for (var a of testAgent){
        if (record.extensionNumber == a){
            var agent = {
              id: record.id,
              number: record.extensionNumber,
              mergedTranscription: {
                index: -1,
                customer: [],
                agent: []
              }
            }
            agentsList.push(agent)
            break
        }
        if (record.extensionNumber == "119")
          supervisorExtensionId = record.id
      }
    }
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
      //console.log("save sub_id")
    })
}

async function readCallMonitoringGroup(){
  var r = await rcsdk.get('/restapi/v1.0/account/~/call-monitoring-groups')
  var json = await r.json()
  agentsList = []
  for (var record of json.records){
    if (record.id == "19165016"){
      var res = await rcsdk.get('/restapi/v1.0/account/~/call-monitoring-groups/' + record.id + "/members")
      var json1 = await res.json()
      for (var rec of json1.records){
        console.log(rec)
        console.log("=====")
        if (rec.permissions[0] == "Monitored"){
          var agent = {
            id: rec.id,
            number: rec.extensionNumber,
            mergedTranscription: {
              index: -1,
              customer: [],
              agent: []
            }
          }
          agentsList.push(agent)
        }else if (rec.permissions[0] == "Monitoring"){
          supervisorExtensionId = rec.id
        }
      }
    }
  }
}
async function checkRegisteredWebHookSubscription(subscriptionId) {
    //console.log("subId: " + subscriptionId)
    try {
      let response = await rcsdk.get('/restapi/v1.0/subscription')
      let json = await response.json();
      if (json.records.length > 0){
        for(var record of json.records) {
          //console.log("found id: " + record.id)
          if (record.id == subscriptionId) {
            if (record.deliveryMode.transportType == "WebHook"){
              if (process.env.DELETE_EXISTING_WEBHOOK_SUBSCRIPTION == 1){
                // Needed for local test as ngrok address might be expired
                console.log("Subscription exist => delete it then subscribe a new one")
                await rcsdk.delete('/restapi/v1.0/subscription/' + record.id)
                startWebhookSubscription()
              }else{
                await readCallMonitoringGroup()
                // await readExtensions()
                g_subscriptionId = subscriptionId
                if (record.status != "Active"){
                  console.log("Subscription is not active => renew it")
                  await rcsdk.post('/restapi/v1.0/subscription/' + record.id + "/renew")
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
async function deleteRegisteredWebHookSubscription(subscriptionId, callback) {
  let response = await rcsdk.get('/restapi/v1.0/subscription')
  let json = await response.json();
  if (json.records.length > 0){
    for (var record of json.records) {
      if (record.deliveryMode.transportType == "WebHook"){
        if (subscriptionId == record.id){
          await rcsdk.delete('/restapi/v1.0/subscription/' + record.id)
          console.log("Deleted")
          return callback(null, "deleted")
        }
      }
    }
    return callback(null, "no subscription")
  }else{
    return callback(null, "no subscription")
  }
}

async function deleteAllRegisteredWebHookSubscriptions() {
  let response = await rcsdk.get('/restapi/v1.0/subscription')
  let json = await response.json();
  if (json.records.length > 0){
    for (var record of json.records) {
      if (record.deliveryMode.transportType == "WebHook"){
          await rcsdk.delete('/restapi/v1.0/subscription/' + record.id)
          console.log("Deleted")
      }
    }
    console.log("Deleted all")
  }else{
    console.log("No subscription to delete")
  }
}
