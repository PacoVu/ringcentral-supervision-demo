const express = require('express')
const cors = require('cors')
const path = require('path')
var fs = require('fs')
require('dotenv').config()
const RingCentral = require('@ringcentral/sdk').SDK
const PhoneEngine = require('./supervisor-engine');

var monitoredAgents = []
var supervisorExtensionId = ""

// Create the server
const app = express()

app.use(express.static(path.join(__dirname, 'client/build')))


let supervisor = new PhoneEngine()
let deviceId = process.env.SIP_INFO_AUTHORIZATION_ID
var eventResponse = null
var g_subscriptionId = ""

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

app.get('/enable_recording', cors(), async (req, res) => {
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

app.get('*', cors(), (req, res) => {
  console.log("LOAD INDEX")
  res.set({
    'Connection': 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });
  res.sendFile(path.join(__dirname + '/client/build/index.html'))
  console.log("call login?")
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
          if (party.status.code === "Proceeding"){
            var agent = monitoredAgents.find(o => o.id == party.extensionId)
            if (agent){
              agent.status = party.status.code
              sendPhoneEvent('ringing')
            }
          }else if (party.status.code === "Answered"){
            var agent = monitoredAgents.find(o => o.id == party.extensionId)
            if (agent){
              if (agent.status == "Hold")
              return
              agent.status = party.status.code
              getCallSessionInfo(jsonObj, agent, party.direction)
            }
          }else if (party.status.code === "Hold"){
            var agent = monitoredAgents.find(o => o.id == party.extensionId)
            if (agent){
              agent.status = party.status.code
              // Can pause recording/monitoring for this party
            }
          }else if (party.status.code === "Disconnected"){
            var agent = monitoredAgents.find(o => o.id == party.extensionId)
            if (agent){
              agent.status = party.status.code
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

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`)
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
}

function mergingChannels(speakerId, transcript){
  var agentInfo = monitoredAgents.find(o => o.id == '595861017')
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
}

async function getCallSessionInfo(payload, agent, direction){
  var body = payload.body
  var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telephonySessionId}`
  var res = await rcsdk.get(endpoint)
  var json = await res.json()

  agent.mergedTranscription = {
    index: -1,
    customer: [],
    agent: []
  }
  const forLoop = async _ => {
    for(var party of json.parties){
      if (party.status.code != "Answered")
        continue
      var params = {
        ownerId: payload.ownerId,
        telSessionId: json.id,
        extensionId: agent.id.toString() //
      }
      if (direction == "Inbound"){ // Inbound call
        if (party.direction == "Outbound"){
          params['partyId'] = party.id
          params['speakerName'] = (party.from.name) ? party.from.name : "Customer"
          params['speakerId'] = 0 // a customer
        }else{
          if (party.extensionId == agent.id.toString()){
            params['partyId'] = party.id
            params['speakerName'] = (party.to.name) ? party.to.name : "Agent"
            params['speakerId'] = 1 // an agent
          }
        }
      }else{ // Outbound call
        if (party.direction == "Outbound"){
          if (party.extensionId == agent.id.toString()){
            params['partyId'] = party.id
            params['speakerName'] = "Agent" // (party.from.name) ? party.from.name : "Agent"
            params['speakerId'] = 1 // a customer
          }
        }else{
          params['partyId'] = party.id
          params['speakerName'] = "Customer" // (party.from.name) ? party.from.name : "Customer"
          params['speakerId'] = 0 // an agent
        }
      }
      await submitSuperviseRequest(params)
    }
  }
  forLoop()
}

async function submitSuperviseRequest(inputParams){
  if (deviceId != ""){
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
        var res = await platform.post(endpoint, params)
        console.log("POST supervise succeeded")
      }catch(e) {
        console.log("POST supervise failed")
        console.log(e.message)
      }
  }else{
    console.log("No device Id")
  }
}

module.exports.mergingChannels = mergingChannels;
module.exports.sendPhoneEvent = sendPhoneEvent;

const rcsdk = new RingCentral({
  server: process.env.RINGCENTRAL_SERVER_URL,
  clientId: process.env.RINGCENTRAL_CLIENT_ID,
  clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
})


function startNotification(){
  console.log("startNotification")
  try {
    g_subscriptionId = fs.readFileSync("subscriptionid.txt")
    if (g_subscriptionId != ""){
      console.log("saved subId: " + g_subscriptionId)
      checkRegisteredWebHookSubscription()
    }else{
      startWebhookSubscription()
    }
  }catch(e){
    console.log("The subscriptionid.txt file does not exist.")
    startWebhookSubscription()
  }
}

var platform = rcsdk.platform();

platform.on(platform.events.loginSuccess, async function(e){
  console.log("Login success")
  await readCallMonitoringGroup()
  if (supervisorExtensionId != ""){
    supervisor.initializePhoneEngine()
    startNotification()
  }else{
    console.log("Cannot read call monitor group")
  }
});

platform.on(platform.events.refreshError, async function(e){
    console.log(e.message)
    try{
      console.log("Cannot refresh token => login again")
      await platform.login({
        jwt: process.env.RINGCENTRAL_JWT
      })
    }catch(e){
      console.log(e.message)
      console.log("LOGIN FAILED")
      return
    }

});

platform.on(platform.events.refreshSuccess, async function(res){
    console.log("Refresh token success")
});

async function login(){
  var loggedIn = await platform.loggedIn()
  if (loggedIn){
    console.log("Still logged in => good to call APIs")
    await readCallMonitoringGroup()
    console.log("supervisorExtensionId: " + supervisorExtensionId)
    supervisor.initializePhoneEngine()
    startNotification()
  }
}

async function logout(){
  if (g_subscriptionId != ""){
    deleteRegisteredWebHookSubscription()
  }
  await rcsdk.platform().logout()
}

async function startWebhookSubscription() {
  console.log("startWebhookSubscription")
    var eventFilters = []
    for (var agent of monitoredAgents){
      eventFilters.push(`/restapi/v1.0/account/~/extension/${agent.id}/telephony/sessions`)
    }
    console.log(eventFilters)
    var bodyParams = {
        eventFilters: eventFilters,
        deliveryMode: {
            transportType: 'WebHook',
            address: process.env.DELIVERY_ADDRESS
        }
    }

    try{
      var res = await  platform.post('/restapi/v1.0/subscription', bodyParams)
      console.log("Subscribed")
      var jsonObj = await res.json()
      console.log("Ready to receive telephonyStatus notification via WebHook.")
      g_subscriptionId = jsonObj.id
      fs.writeFileSync("subscriptionid.txt", jsonObj.id)
    }catch(e){
      console.log("Failed?",e.message)
    }
}

async function readCallMonitoringGroup(){
  console.log(process.env.SUPERVISOR_GROUP_NAME)
  var resp = await rcsdk.get('/restapi/v1.0/account/~/call-monitoring-groups')
  var jsonObj = await resp.json()
  monitoredAgents = []
  for (var group of jsonObj.records){
    if (group.name == process.env.SUPERVISOR_GROUP_NAME){
      var resp = await rcsdk.get(`/restapi/v1.0/account/~/call-monitoring-groups/${group.id}/members`)
      var jsonObj1 = await resp.json()
      for (var member of jsonObj1.records){
        if (member.permissions[0] == "Monitored"){
            console.log("Monitored Agent: " + member.extensionNumber)
            var agentInfo = {
                id: member.id,
                status: 'Disconnected',
                mergedTranscription: {
                  index: -1,
                  customer: [],
                  agent: []
                }
            }
            monitoredAgents.push(agentInfo)
        }else if (member.permissions[0] == "Monitoring"){
          console.log("Supervisor: " + member.extensionNumber)
          supervisorExtensionId = member.id
        }
      }
    }
  }
}

async function checkRegisteredWebHookSubscription() {
    try {
      let response = await platform.get('/restapi/v1.0/subscription')
      let jsonObj = await response.json()
      if (jsonObj.records.length > 0){
        for(var record of jsonObj.records) {
          if (record.id == g_subscriptionId) {
            console.log("sub id: " + record.id)
            if (record.deliveryMode.transportType == "WebHook"){
              if (process.env.DELETE_EXISTING_WEBHOOK_SUBSCRIPTION == 1){
                // Needed for local test as ngrok address might be expired
                console.log("Subscription exist => delete it then subscribe a new one")
                await platform.delete('/restapi/v1.0/subscription/' + record.id)
                startWebhookSubscription()
              }else{
                if (record.status != "Active"){
                  console.log("Subscription is not active => renew it")
                  await platform.post('/restapi/v1.0/subscription/' + record.id + "/renew")
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

async function deleteRegisteredWebHookSubscription() {
  let response = await rcsdk.get('/restapi/v1.0/subscription')
  let json = await response.json();
  if (json.records.length > 0){
    for (var record of json.records) {
      if (record.deliveryMode.transportType == "WebHook"){
        if (g_subscriptionId == record.id){
          await rcsdk.delete('/restapi/v1.0/subscription/' + record.id)
          console.log("Deleted")
          fs.writeFileAsync("subscriptionid.txt", "")
          return
        }
      }
    }
    console.log("no subscription")
  }else{
    console.log("no subscription to delete")
  }
}

/// Clean up WebHook subscriptions
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
    fs.writeFileSync("subscriptionid.txt", "")
  }else{
    console.log("No subscription to delete")
  }
}
