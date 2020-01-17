require('dotenv').config()
const RingCentral = require('@ringcentral/sdk').SDK
const Subscriptions = require('@ringcentral/subscriptions').default
const fs = require('fs')
//import { nonstandard } from 'wrtc'
const { RTCAudioSink } = require('wrtc').nonstandard
const Softphone = require('ringcentral-softphone').default

const WatsonEngine = require('./watson.js');
var server = require('./index')
var watson = new WatsonEngine()

//const { RTCAudioSink } = nonstandard
let softphone = null

const rc = new RingCentral({
  server: process.env.RINGCENTRAL_SERVER_URL,
  clientId: process.env.RINGCENTRAL_CLIENT_ID,
  clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
})

const login = async () => {
  if (softphone)
    return
  await rc.login({
    username: process.env.RINGCENTRAL_USERNAME,
    extension: process.env.RINGCENTRAL_EXTENSION,
    password: process.env.RINGCENTRAL_PASSWORD
  })
  if (!softphone){
    softphone = new Softphone(rc)
    try {
      await softphone.register()
      console.log("Registered deviceId: " + softphone.device.id)
      server.sendPhoneEvent('online')
      let audioSink
      let audioStream
      /*
      const audioPath = 'audio.raw'
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath)
      }
      */
      softphone.on('INVITE', sipMessage => {
        console.log("GOT INVITED")
        watson.createWatsonSocket("16000", (err, res) => {
          if (!err) {
            softphone.answer()
            server.sendPhoneEvent('connected')
            var bufferSize = 65000
            var maxFrames = 32

            softphone.on('track', e => {
              audioSink = new RTCAudioSink(e.track)
              //audioStream = fs.createWriteStream(audioPath, { flags: 'a' })
              var frames = 0
              var buffer = null
              audioSink.ondata = data => {
                //console.log(`live audio data received, sample rate is ${data.sampleRate}`)
                var buf = Buffer.from(data.samples.buffer)
                //console.log(buf.length)
                if (buffer != null)
                    buffer = Buffer.concat([buffer, buf])
                else
                    buffer = buf
                frames++
                if (frames >= maxFrames){ //68
                    //console.log("call transcribe")
                    //console.log("maxFrames: " + maxFrames)
                    watson.transcribe(buffer)
                    buffer = Buffer.from('')
                    frames=0
                }
                //audioStream.write(Buffer.from(data.samples.buffer))
              }
            })
          }
        })
      })
      softphone.on('BYE', () => {
        audioSink.stop()
        //audioStream.end()
        watson.closeConnection()
        //server.sendPhoneEvent('idle')
      })
    }catch(e){
      console.log(e)
    }
  }
  //await startWebhookSubscription()
  //await startPubNubSubscription()
  checkExistingSubscription()
  //removeAllRegisteredSubscriptions()
}

function handleCallRecording(recoringState){
  console.log("recoringState: " + recoringState)
}

function checkExistingSubscription(){
  fs.readFile('subscriptionId.txt', 'utf8', function (err, id) {
      if (err) {
        console.log("call startWebHookSubscription")
        //startPubNubSubscription()
        startWebhookSubscription()
      }else{
        console.log("subscription id: " + id)
        //removeRegisteredPubNubSubscription(id)
        checkRegisteredWebHookSubscription(id)
      }
    });
}

/// WEBHOOK

async function startWebhookSubscription() {

  var r = await rc.get('/restapi/v1.0/account/~/extension')
  var json = await r.json()
  const agentExt = json.records.filter(ext => ext.extensionNumber === process.env.RINGCENTRAL_AGENT_EXT)[0]

  var paramsEvent = `/restapi/v1.0/account/~/extension/${agentExt.id}/telephony/sessions`
  var eventFilters = [
        paramsEvent
      ]
  console.log("agentExt: " + agentExt.extensionNumber)
  console.log(paramsEvent)
  console.log("subscription: " + process.env.DELIVERY_MODE_ADDRESS)

  var res = await  rc.post('/restapi/v1.0/subscription',
          {
              eventFilters: eventFilters,
              deliveryMode: {
                  transportType: 'WebHook',
                  address: process.env.DELIVERY_MODE_ADDRESS
              }
          })
  var jsonObj = await res.json()
  console.log("Ready to telephonyStatus notification via WebHook.")
  console.log(JSON.stringify(jsonObj))
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
    let response = await rc.get('/restapi/v1.0/subscription')
    let json = await response.json();

    //const agentExt = json.records.filter(ext => ext.extensionNumber === process.env.RINGCENTRAL_AGENT_EXT)[0]
    if (json.records.length > 0){
      for(var record of json.records) {
        if (record.id == subscriptionId) {
          if (record.deliveryMode.transportType == "WebHook"){
            if (record.status != "Active"){
              console.log("subscription is not active. Renew it")
              await rc.post('/restapi/v1.0/subscription/' + record.id + "/renew")
              console.log("updated: " + record.id)
            }else {
              console.log("subscription is active. Good to go.")
              console.log("sub status: " + record.status)
            }
          }
        }
      }
    }else{
      // no existing subscription for this service. Not likely getting here
      console.log("No subscription for this service => Create one")
      startWebhookSubscription()
    }
  }catch(e){
    console.log("checkRegisteredWebHookSubscription ERROR")
    console.log(e)
  }
}

function checkRegisteredWebHookSubscription1(subscriptionId) {
    rc.get('/restapi/v1.0/subscription')
        .then(function (response) {
          var data = response.json();
          if (data.records.length > 0){
            for(var record of data.records) {
              if (record.id == subscriptionId) {
                if (record.deliveryMode.transportType == "WebHook"){
                  if (record.status != "Active"){
                    console.log("subscription is not active. Renew it")
                    platform.post('/subscription/' + record.id + "/renew")
                      .then(function (response) {
                        console.log("updated: " + record.id)
                      })
                      .catch(function(e) {
                        console.error(e);
                      });
                  }else {
                    console.log("subscription is active. Good to go.")
                    console.log("sub status: " + record.status)
                  }
                }
              }
            }
          }else{
            // no existing subscription for this service. Not likely getting here
            console.log("No subscription for this service => Create one")
            startWebhookSubscription()
          }
        })
        .catch(function(e) {
          console.error(e);
          callback(e.message, "")
        });
}

//


async function startPubNubSubscription () {
  const r = await rc.get('/restapi/v1.0/account/~/extension')
  const json = await r.json()
  const agentExt = json.records.filter(ext => ext.extensionNumber === process.env.RINGCENTRAL_AGENT_EXT)[0]
  const subscriptions = new Subscriptions({
    sdk: rc
  })
  const subscription = subscriptions.createSubscription({
    pollInterval: 10 * 1000,
    renewHandicapMs: 2 * 60 * 1000
  })
  var paramsEvent = `/restapi/v1.0/account/~/extension/${agentExt.id}/telephony/sessions`
  console.log("subscribe: " + paramsEvent)
  subscription.setEventFilters([paramsEvent])

  subscription.on(subscription.events.notification, async function (message) {
    console.log("SUBSCRIPTION")
    if (message.body.parties.some(p => p.status.code === 'Answered' && p.direction === 'Inbound')) {
      console.log("ANSWER")
      try{
        var res = await rc.post(`/restapi/v1.0/account/~/telephony/sessions/${message.body.telephonySessionId}/supervise`, {
          mode: 'Listen',
          supervisorDeviceId: softphone.device.id,
          agentExtensionNumber: agentExt.extensionNumber
        })
      }catch(e) {
        console.log(e)
      }
      console.log(res)
    }
  })

  var response = await subscription.register()
  var jsonObj = subscription.subscription()
  console.log(JSON.stringify(jsonObj))
  //await fs.writeFile('subscriptionId.txtt', jsonObj.id);

  fs.writeFile("subscriptionId.txt", jsonObj.id, function(err) {
    if(err)
      console.log(err);
    else
      console.log("SubscriptionId " + jsonObj.id + " is saved.");
  });
}


function removeRegisteredPubNubSubscription(id) {
  console.log("removeRegisteredPubNubSubscription")
  rc.delete('/restapi/v1.0/subscription/' + id)
    .then(function (response) {
      console.log("deleted: " + id)
      startPubNubSubscription()
    })
    .catch(function(e) {
      console.log("Subscriptiob not found")
      console.error(e.toString());
      startPubNubSubscription()
    });
}

const enableTranslation = (flag) => {
  if (watson)
    watson.enableTranslation(flag)
}

function removeAllRegisteredSubscriptions() {
  rc.get('/restapi/v1.0/subscription/')
    .then(function (response) {
      var jsonObj = response.json()
      console.log(JSON.stringify(jsonObj))
      for (var record of jsonObj.records){
        console.log("record " + JSON.stringify(record))
        console.log("====")
      }

      for (var record of jsonObj.records) {
          rc.delete('/subscription/' + record.id)
            .then(function (resp){
              console.log('delete ' + record.id)
            })
      }
    })
    .catch(function(e) {
      console.error(e.toString());
    });
}

async function processTelephonySessionNotification(body){
  //if (body.parties.some(p => p.status.code === 'Answered' && p.direction === 'Inbound')) {
    console.log("ANSWER: " + JSON.stringify(body))
    console.log("deviceId: " + softphone.device.id)
    try{
      var res = await rc.post(`/restapi/v1.0/account/~/telephony/sessions/${body.telephonySessionId}/supervise`, {
        mode: 'Listen',
        supervisorDeviceId: softphone.device.id,
        agentExtensionNumber: process.env.RINGCENTRAL_AGENT_EXT //agentExt.extensionNumber
      })
    }catch(e) {
      console.log(e)
    }
  //}
}

//login()
//removeAllRegisteredSubscriptions()

module.exports = {
  login,
  enableTranslation,
  handleCallRecording,
  processTelephonySessionNotification
  //startSubscription
}
