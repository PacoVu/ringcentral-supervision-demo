const express = require('express')
var fs = require('fs')

const RingCentral = require('@ringcentral/sdk').SDK
const PhoneEngine = require('./supervisor-engine');

var monitoredAgents = []

//var supervisorExtensionId = ""
const subscriptionFile = "subscription.txt"
var subscriptionId = ''
if (fs.existsSync(subscriptionFile))
  subscriptionId = fs.readFileSync(subscriptionFile, "utf-8")

console.log("subscriptionId", subscriptionId)
// Create the server
const app = express()

require('dotenv').config()


let supervisor = new PhoneEngine()
app.get('/', (req, res) => {
  res.send('Hello World!')
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
        }).on('end', async function() {
            body = Buffer.concat(body).toString();
            var jsonObj = JSON.parse(body)
            if (jsonObj.subscriptionId == subscriptionId) {
              for (var party of jsonObj.body.parties){
                if (party.direction === "Inbound"){
                    if (party.status.code === "Proceeding"){
                      var agent = monitoredAgents.find(o => o.id == party.extensionId)
                      if (agent){
                        agent.status = party.status.code
                        console.log('ringing')
                      }
                    }else if (party.status.code === "Answered"){
                      var agent = monitoredAgents.find(o => o.id == party.extensionId)
                      if (agent){
                        if (agent.status == "Hold"){
                          console.log("Call on hold => return")
                          agent.status = party.status.code
                          return
                        }
                        console.log("Answered", party)
                        agent.status = party.status.code
                        if (!party.status.hasOwnProperty('reason')){
                          await getCallSessionInfo(jsonObj, agent)
                        }else{
                          console.log(party.status)
                          if (party.status.reason == "AttendedTransfer"){
                            console.log('Attended transfers this call')
                            await getWarmTransferSessionInfo(jsonObj, agent)
                          }
                        }
                      }else{
                        console.log("body")
                      }
                      console.log('answered')
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
                        console.log('idle')
                      }
                    }else if (party.status.code === "Gone"){
                      console.log("Ignore Gone event")

                      var agent = monitoredAgents.find(o => o.id == party.extensionId)
                      if (agent){
                        console.log("Gone", jsonObj.body)
                        agent.status = party.status.code
                        console.log('Agent transfers this call')
                        getWarmTransferSessionInfo(jsonObj, agent)
                      }

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

function startNotification(){
  console.log("startNotification")
  if (subscriptionId == ""){
    console.log("create new subscription?")
    startWebhookSubscription()
  }else{
    checkRegisteredWebHookSubscription()
  }
}

const rcsdk = new RingCentral({
  server: process.env.RINGCENTRAL_SERVER_URL,
  clientId: process.env.RINGCENTRAL_CLIENT_ID,
  clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
})
var platform = rcsdk.platform();

login()
async function login(){
  try{
    await platform.login({
      jwt: process.env.RINGCENTRAL_JWT
    })
  }catch(e){
    console.log(e.message)
    console.log("LOGIN FAILED")
    return
  }
}


platform.on(platform.events.loginSuccess, async function(e){
  console.log("Login success")
  let result = await readCallMonitoringGroup()
  if (result != ""){
    supervisor.initializePhoneEngine(rcsdk)
    startNotification()
  }else{
    console.log("Cannot find call monitor group", "")
  }
});

// handle auto refresh token
setInterval(function (){
  platform.loggedIn()
  console.log("Force auto refresh hourly")
}, 3600000)

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


async function getCallSessionInfo(payload, agent){
  var body = payload.body
  var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telephonySessionId}`
  var resp = await platform.get(endpoint)
  var jsonObj = await resp.json()
  console.log("getCallSessionInfo - Call sessions")
  const forLoop = async _ => {
    for (let party of jsonObj.parties) {
      if (party.status.code == "Disconnected"){
        console.log('This party got disconnected => Cannot supervised', party.id)
      }else if (party.status.code == "Answered"){
        //console.log('party', party)
        let existingChannel = supervisor.getChannel(party.id)
        if (existingChannel == undefined){
          var params = {
            ownerId: payload.ownerId,
            telSessionId: jsonObj.id,
            extensionId: agent.id.toString() //
          }
          if (party.direction == "Outbound"){
              params['partyId'] = party.id
              params['speakerName'] = (party.from.name) ? party.from.name : "Customer"
              params['speakerId'] = 0 // a customer
              await submitSuperviseRequest(params)
          }else{
            if (party.extensionId == agent.id.toString()){
              params['partyId'] = party.id
              params['speakerName'] = (party.to.name) ? party.to.name : "Agent"
              params['speakerId'] = 1 // an agent
              await submitSuperviseRequest(params)
            }
          }
        }else{
          console.log("This party is being monitored.", party.id)
        }
      }
    }
  }
  forLoop()
}

async function getWarmTransferSessionInfo(payload, agent){
  var body = payload.body
  var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telephonySessionId}`
  var resp = await platform.get(endpoint)
  var jsonObj = await resp.json()
  console.log("getWarmTransferSessionInfo - Call sessions")
  const forLoop = async _ => {
    for (let party of jsonObj.parties) {
      if (party.status.code == "Disconnected"){
        console.log('This party got disconnected => Cannot supervised', party.id)
      }else if (party.status.code == "Gone" && party.status.reason == "AttendedTransfer"){
        var params = {
          ownerId: payload.ownerId,
          telSessionId: body.telephonySessionId,
          extensionId: agent.id.toString() //party.extensionId //
        }
        if (party.direction == "Outbound"){
            var partyId = party.status.peerId.partyId
            params['telSessionId'] = party.status.peerId.sessionId
            params['partyId'] = partyId.replace('-2', '-1')
            params['speakerName'] = (party.from.name) ? party.from.name : "Customer"
            params['speakerId'] = 0 // a customer
            console.log("Subcribe for Customer after transfer???")
            await submitSuperviseRequest(params)
        }else{
          if (party.extensionId == agent.id.toString()){
            params['partyId'] = party.id
            params['speakerName'] = (party.to.name) ? party.to.name : "Agent"
            params['speakerId'] = 1 // an agent
            console.log("Subcribe for Agent after transfer???")
            await submitSuperviseRequest(params)
          }
        }
      }else if (party.status.code == "Answered"){
        let existingChannel = supervisor.getChannel(party.id)
        if (existingChannel == undefined){
          var params = {
            ownerId: payload.ownerId,
            telSessionId: jsonObj.id,
            extensionId: agent.id.toString() //
          }
          if (party.direction == "Outbound"){
              params['partyId'] = party.id
              params['speakerName'] = (party.from.name) ? party.from.name : "Customer"
              params['speakerId'] = 0 // a customer
              await submitSuperviseRequest(params)
          }else{
            if (party.extensionId == agent.id.toString()){
              params['partyId'] = party.id
              params['speakerName'] = (party.to.name) ? party.to.name : "Agent"
              params['speakerId'] = 1 // an agent
              await submitSuperviseRequest(params)
            }
          }
        }else{
          console.log("This party is being monitored.", party.id)
        }
      }
    }
  }
  forLoop()
}

async function submitSuperviseRequest(inputParams){
  if (supervisor.deviceId != ""){
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
                supervisorDeviceId: supervisor.deviceId
              }
        params['agentExtensionId'] = inputParams.extensionId
        var res = await platform.post(endpoint, params)
        console.log("ENDPOINT", endpoint)
        console.log(params)
        console.log("POST supervise succeeded")
      }catch(e) {
        console.log("ENDPOINT", endpoint)
        console.log(params)
        console.log(e.message)
        console.log("POST supervise failed => remove this from supervised channels!")
        supervisor.removeChannel(inputParams.partyId)

      }
  }else{
    console.log("No supervisor's device Id => Check and try Softphone registration again")
  }
}

async function startWebhookSubscription() {
  console.log("startWebhookSubscription")
    var eventFilters = []
    for (var agent of monitoredAgents){
      eventFilters.push(`/restapi/v1.0/account/~/extension/${agent.id}/telephony/sessions`)
    }
    console.log(eventFilters)
    try{
      var res = await  platform.post('/restapi/v1.0/subscription',
                {
                    eventFilters: eventFilters,
                    deliveryMode: {
                        transportType: 'WebHook',
                        address: process.env.DELIVERY_ADDRESS
                    },
                    expiresIn: 86400
                })
      console.log("Subscribed")
      var jsonObj = await res.json()
      console.log("Ready to receive telephonyStatus notification via WebHook.")
      subscriptionId = jsonObj.id
      fs.writeFileSync(subscriptionFile, subscriptionId)
    }catch(e){
      console.log(e.message)
    }
}

async function readCallMonitoringGroup(){
  console.log(process.env.SUPERVISOR_GROUP_NAME)
  var resp = await rcsdk.get('/restapi/v1.0/account/~/call-monitoring-groups')
  var jsonObj = await resp.json()
  monitoredAgents = []
  var supervisorExtensionId = ""
  for (var group of jsonObj.records){
    if (group.name == process.env.SUPERVISOR_GROUP_NAME){
      var resp = await rcsdk.get('/restapi/v1.0/account/~/call-monitoring-groups/' + group.id + "/members")
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
  return supervisorExtensionId
}

async function checkRegisteredWebHookSubscription() {
    try {
      let response = await rcsdk.get('/restapi/v1.0/subscription')
      let json = await response.json()
      console.log("checkRegisteredWebHookSubscription: " + json.records.length)
      if (json.records.length > 0){
        for(var record of json.records) {
          if (record.id == subscriptionId) {
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
      //login()
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
    fs.writeFileSync(subscriptionFile, "")
  }else{
    console.log("No subscription to delete")
  }
}
