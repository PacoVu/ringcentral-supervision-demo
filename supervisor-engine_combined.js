require('dotenv').config()
const RingCentral = require('@ringcentral/sdk').SDK
//const Subscriptions = require('@ringcentral/subscriptions').default
const fs = require('fs')
const { RTCAudioSink } = require('wrtc').nonstandard
const Softphone = require('ringcentral-softphone').default

const WatsonEngine = require('./watson.js');
var server = require('./index')

// playback recording
// play -c 1 -r 16000 -e signed -b 16 audio.raw

function PhoneEngine() {
  this.watson = new WatsonEngine()
  this.speachRegconitionReady = false
  this.doRecording = false
  this.audioStream = null
  this.softphone = null
  this.deviceId = ""
  this.rc = new RingCentral({
    server: process.env.RINGCENTRAL_SERVER_URL,
    clientId: process.env.RINGCENTRAL_CLIENT_ID,
    clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
  })
  return this
}

PhoneEngine.prototype = {
  initializePhoneEngine: async function(){
    console.log("initializePhoneEngine")
    if (this.softphone)
      return
    await this.rc.login({
      username: process.env.RINGCENTRAL_USERNAME,
      extension: process.env.RINGCENTRAL_EXTENSION,
      password: process.env.RINGCENTRAL_PASSWORD
    })

    this.softphone = new Softphone(this.rc)
    try {
        await this.softphone.register()
        this.deviceId = this.softphone.device.id
        console.log("Registered deviceId: " + this.deviceId)
        server.sendPhoneEvent('online')
        let audioSink

        this.softphone.on('INVITE', sipMessage => {
          console.log("GOT INVITED")
          var maxFrames = 60
          this.softphone.answer(sipMessage)
          server.sendPhoneEvent('connected')
          this.softphone.once('track', e => {
            audioSink = new RTCAudioSink(e.track)
            var frames = 0
            var buffer = null
            var creatingWatsonSocket = false
            audioSink.ondata = data => {
              var buf = Buffer.from(data.samples.buffer)
              if (!creatingWatsonSocket && !this.speachRegconitionReady){
                creatingWatsonSocket = true
                this.watson.createWatsonSocket(data.sampleRate, (err, res) => {
                  if (!err) {
                    this.speachRegconitionReady = true
                    console.log("WatsonSocket created!")
                  }
                })
              }
              if (buffer != null)
                  buffer = Buffer.concat([buffer, buf])
              else
                  buffer = buf
              frames++
              if (frames >= maxFrames){
                  //console.log("call transcribe")
                  //console.log("maxFrames: " + maxFrames)
                  //console.log(`live audio data received, sample rate is ${data.sampleRate}`)
                  if (this.speachRegconitionReady){
                    console.log("call transcribe " + buffer.length)
                    this.watson.transcribe(buffer)
                  }else{
                    console.log("Dumping data")
                  }
                  buffer = Buffer.from('')
                  frames=0
              }
              if (this.doRecording)
                this.audioStream.write(Buffer.from(data.samples.buffer))
            }
          })
      })
      this.softphone.on('BYE', () => {
          console.log("RECEIVE BYE MESSAGE => Hanged up now")
          audioSink.stop()
          if (this.doRecording)
            this.audioStream.end()
          console.log("Close Watson socket.")
          this.watson.closeConnection()
          this.speachRegconitionReady = false
          //server.sendPhoneEvent('idle')
        })
    }catch(e){
        console.log(e)
    }

    var thisClass = this
    fs.readFile('subscriptionId.txt', 'utf8', function (err, id) {
        if (err) {
          console.log("call startWebHookSubscription")
          thisClass.startWebhookSubscription()
        }else{
          console.log("subscription id: " + id)
          thisClass.checkRegisteredWebHookSubscription(id)
        }
      });
  },
  hangup: function(){

  },
  enableRecording: function(recording){
    if (recording){
      const audioPath = 'audio.raw'
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath)
      }
      this.audioStream = fs.createWriteStream(audioPath, { flags: 'a' })
      this.doRecording = true
    }else{
      this.doRecording = false
      this.audioStream.close() // end
    }
  },
  handleCallRecording: function (recoringState){
    console.log("recoringState: " + recoringState)
  },
  enableTranslation: function(flag) {
    if (this.watson)
      this.watson.enableTranslation(flag)
  },
  processTelephonySessionNotification: async function (body){
      try{
        var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telephonySessionId}/supervise`
        var params = {
          mode: 'Listen',
          supervisorDeviceId: this.deviceId,
          agentExtensionNumber: process.env.RINGCENTRAL_AGENT_EXT
        }
        var res = await this.rc.post(endpoint, params)
      }catch(e) {
        console.log(e.message)
        console.log(e)
      }
  },
  startWebhookSubscription: async function() {
    var r = await this.rc.get('/restapi/v1.0/account/~/extension')
    var json = await r.json()
    const agentExt = json.records.filter(ext => ext.extensionNumber === process.env.RINGCENTRAL_AGENT_EXT)[0]

    var paramsEvent = `/restapi/v1.0/account/~/extension/${agentExt.id}/telephony/sessions`
    var eventFilters = [
          paramsEvent
        ]

    var res = await  this.rc.post('/restapi/v1.0/subscription',
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

  },
  checkRegisteredWebHookSubscription: async function (subscriptionId) {
    try {
      let response = await this.rc.get('/restapi/v1.0/subscription')
      let json = await response.json();
      if (json.records.length > 0){
        for(var record of json.records) {
          if (record.id == subscriptionId) {
            if (record.deliveryMode.transportType == "WebHook"){
              if (process.env.DELETE_EXISTING_WEBHOOK_SUBSCRIPTION == 1){
                // Needed for local test as ngrok address might be expired
                console.log("Subscription exist => delete it then subscribe a new one")
                await this.rc.delete('/restapi/v1.0/subscription/' + record.id)
                this.startWebhookSubscription()
              }else{
                if (record.status != "Active"){
                  console.log("Subscription is not active => renew it")
                  await this.rc.post('/restapi/v1.0/subscription/' + record.id + "/renew")
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
        this.startWebhookSubscription()
      }
    }catch(e){
      console.log("checkRegisteredWebHookSubscription ERROR")
      console.log(e)
    }
  }

}
module.exports = PhoneEngine;


/// Clean up WebHook subscriptions
function deleteAllRegisteredWebHookSubscriptions(platform) {
    platform.get('/restapi/v1.0/subscription')
        .then(function (response) {
          var data = response.json();
          if (data.records.length > 0){
            for(var record of data.records) {
                if (record.deliveryMode.transportType == "WebHook"){
                    platform.delete('/subscription/' + record.id)
                      .then(function (response) {
                        console.log("Deleted: " + record.id)
                      })
                      .catch(function(e) {
                        console.error(e);
                      });
                }
            }
          }
        })
        .catch(function(e) {
          console.error(e);
        });
}
