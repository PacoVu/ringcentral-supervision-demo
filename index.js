const express = require('express')
const cors = require('cors')
const path = require('path')
const pgdb = require('./db')
const async = require('async')
var fs = require('fs')

const RingCentral = require('@ringcentral/sdk').SDK

// Test params
var agentInfo = {
    id: "",
    mergedTranscription: {
      index: -1,
      customer: [],
      agent: []
    }
}
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
})

app.get('/enable_translation', cors(), async (req, res) => {
  console.log("ENABLE TRANSLATION")
  var queryData = req.query;
  console.log(queryData.enable)
  supervisor.enableTranslation(queryData.enable)
  res.statusCode = 200;
  res.end();
})

app.get('/recording', cors(), async (req, res) => {
  console.log("ENABLE RECORDING")
  var queryData = req.query;
  console.log(queryData.enable)
  supervisor.enableRecording(queryData.enable)
  res.statusCode = 200;
  res.end();
})

// Remove all subscriptions. Needed when changing test environments. E.g. localhost and heroku
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
                if (party.direction === "Inbound"){
                    if (party.status.code === "Proceeding"){
                      if (agentInfo.id == party.extensionId)
                        sendPhoneEvent('ringing')
                    }else if (party.status.code === "Answered"){
                      if (agentInfo.id == party.extensionId)
                        getCallSessionInfo(jsonObj)
                    }else if (party.status.code === "Disconnected"){
                      if (agentInfo.id == party.extensionId)
                        sendPhoneEvent('idle')
                    }
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


function sendPhoneEvent(status){

  var res = 'event: phoneEvent\ndata: ' + status + '\n\n'
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
  if (speakerId == 0){ // customer
    for (let i = 0; i < agentInfo.mergedTranscription.customer.length; i++) {
      if (agentInfo.mergedTranscription.customer[i].index === transcript.index){
        transcript.index = agentInfo.mergedTranscription.index
        return sendTranscriptEvents(transcript)
      }
    }
    agentInfo.mergedTranscription.index++
    var item = {
      index: transcript.index,
      text: transcript.text
    }
    agentInfo.mergedTranscription.customer.push(item)
    transcript.index = agentInfo.mergedTranscription.index
    sendTranscriptEvents(transcript)
  }else{ // agent
    for (let i = 0; i < agentInfo.mergedTranscription.agent.length; i++) {
      if (agentInfo.mergedTranscription.agent[i].index === transcript.index){
        transcript.index = agentInfo.mergedTranscription.index
        return sendTranscriptEvents(transcript)
      }
    }
    agentInfo.mergedTranscription.index++
    var item = {
      index: transcript.index,
      text: transcript.text
    }
    agentInfo.mergedTranscription.agent.push(item)
    transcript.index = agentInfo.mergedTranscription.index
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
});

platform.on(platform.events.refreshError, function(e){
    console.log("Refresh token failed")
    //login()
});

platform.on(platform.events.refreshSuccess, async function(res){
    console.log("Refresh token success")
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

async function getCallSessionInfo(payload){
  var body = payload.body
  var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telephonySessionId}`
  var res = await rcsdk.get(endpoint)
  var json = await res.json()
  agentInfo.mergedTranscription = {
    index: -1,
    customer: [],
    agent: []
  }

  async.each(json.parties,
      function(party, callback){
        var params = {
          ownerId: payload.ownerId,
          telSessionId: json.id,
          extensionId: agentInfo.id.toString()
        }
        if (party.direction == "Outbound"){
            params['partyId'] = party.id
            params['speakerName'] = (party.from.name) ? party.from.name : "Customer"
            params['speakerId'] = 0 // a customer
            submitSuperviseRequest(params)
        }else{
          if (party.extensionId == agentInfo.id.toString()){
            params['partyId'] = party.id
            params['speakerName'] = (party.to.name) ? party.to.name : "Agent"
            params['speakerId'] = 1 // an agent
            submitSuperviseRequest(params)
          }
        }
        callback(null, "")
      },
      function(err){
        console.log("done")
      }
    );
}

async function submitSuperviseRequest(inputParams){
  readDeviceId(inputParams.ownerId, async function (err, deviceId){
    if (!err){
      try{
        var endpoint = `/restapi/v1.0/account/~/telephony/sessions/`
        endpoint += `${inputParams.telSessionId}/parties/${inputParams.partyId}/supervise`
        var agentObj = {}
        agentObj['speakerName'] = inputParams.speakerName
        agentObj['partyId'] = inputParams.partyId
        agentObj['speakerId'] = inputParams.speakerId
        supervisor.setChannel(agentObj)
        var params = {
                mode: 'Listen',
                supervisorDeviceId: deviceId
              }
        params['agentExtensionId'] = inputParams.extensionId
        var res = await rcsdk.post(endpoint, params)
      }catch(e) {
        console.log("POST supervise failed")
        console.log(e.message)
      }
    }
  })
}


async function startWebhookSubscription() {
    var eventFilters = [`/restapi/v1.0/account/~/extension/${agentInfo.id}/telephony/sessions`]
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
    g_subscriptionId = jsonObj.id
    storeSubscriptionId(jsonObj.id)
}

function storeSubscriptionId(subId){
    query = "UPDATE supervision_subscriptionids SET sub_id='" + subId + "' WHERE ext_id=" + supervisorExtensionId
    pgdb.update(query, (err, result) =>  {
      if (err){
        console.error(err.message);
      }
    })
}

// 19165016
async function readCallMonitoringGroup(){
  var resp = await rcsdk.get('/restapi/v1.0/account/~/call-monitoring-groups')
  var jsonObj = await resp.json()
  for (var record of jsonObj.records){
    if (record.name == process.env.SUPERVISOR_GROUP_NAME){
      var resp = await rcsdk.get('/restapi/v1.0/account/~/call-monitoring-groups/' + record.id + "/members")
      var jsonObj1 = await resp.json()
      for (var rec of jsonObj1.records){
        if (rec.permissions[0] == "Monitored"){
          if (rec.extensionNumber == process.env.AGENT_EXTENSION_NUMBER){
            agentInfo.id = rec.id
            agentInfo.mergedTranscription = {
                  index: -1,
                  customer: [],
                  agent: []
                  }
          }
        }else if (rec.permissions[0] == "Monitoring"){
          supervisorExtensionId = rec.id
        }
      }
    }
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
                await readCallMonitoringGroup()
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
