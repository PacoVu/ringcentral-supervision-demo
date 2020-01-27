require('dotenv').config()
const RingCentral = require('@ringcentral/sdk').SDK
const fs = require('fs')
const pgdb = require('./db')
const { RTCAudioSink } = require('wrtc').nonstandard
const Softphone = require('ringcentral-softphone').default

const WatsonEngine = require('./watson.js');
var server = require('./index')
const MAXBUFFERSIZE = 32000
// playback recording
// play -c 1 -r 16000 -e signed -b 16 audio.raw

function PhoneEngine() {
  //this.agentName = agentName
  this.agents = []
  //this.watson = new WatsonEngine("120")
  //this.speachRegconitionReady = false
  //this.doRecording = false
  //this.audioStream = null
  this.softphone = null
  //this.deviceId = ""
  /*
  this.rcsdk = new RingCentral({
    server: process.env.RINGCENTRAL_SERVER_URL,
    clientId: process.env.RINGCENTRAL_CLIENT_ID,
    clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
  })
  */
  console.log("constructor")
  return this
}

PhoneEngine.prototype = {
  initializePhoneEngine: async function(rcsdk, extensionId){
    console.log("initializePhoneEngine")

    if (this.softphone){
      return
    }
    //console.log("THIS IS AGENT " + this.agentName)
    console.log("initialize")
    //this.rcsdk = await server.getRCSDK()
    //console.log("too soon?")
    this.softphone = new Softphone(rcsdk)
    console.log("passed create softphone")
    try {
        await this.softphone.register()
        console.log("passed registered softphone")
        //this.deviceId = this.softphone.device.id
        console.log("Registered deviceId: " + this.softphone.device.id)
        //saveDeviceId(this.deviceId)
        this.storeDeviceId(extensionId, this.softphone.device.id)
        for (var agent of this.agents){
          var phoneStatus = {
            agent: agent.name,
            status: 'ready'
          }
          server.sendPhoneEvent(phoneStatus)
        }

        this.softphone.on('INVITE', sipMessage => {
          console.log("GOT INVITED")
          var headers = sipMessage.headers['p-rc-api-ids'].split(";")
          var sessionId = headers[1].split("=")[1]
          //console.log("Party id: " + headers[0])
          //console.log("Session id: " + headers[1])
          var agentName = ""
          //var agent = null
          var agentIndex = 0
          for (agentIndex=0; agentIndex<this.agents.length; agentIndex++){
            //agent = this.agents[agentIndex]
            console.log(this.agents[agentIndex].sessionId + " === " + sessionId)
            if (this.agents[agentIndex].sessionId == sessionId){
              agentName = this.agents[agentIndex].name
              this.agents[agentIndex].callId = sipMessage.headers['Call-Id']
              this.agents[agentIndex].watson = new WatsonEngine(agentName)
              this.softphone.answer(sipMessage)
              var phoneStatus = {
                agent: this.agents[agentIndex].name,
                status: 'connected'
              }
              server.sendPhoneEvent(phoneStatus)
              break
            }
          }
          var localSpeachRegconitionReady = false
          //let audioSink
          //var maxFrames = 60

          this.softphone.once('track', e => {
            this.agents[agentIndex].audioSink = new RTCAudioSink(e.track)
            //this.agents[agentIndex].audioSink = audioSink
            var buffer = null
            var creatingWatsonSocket = false
            var dumpingFiveFrames = 3
            this.agents[agentIndex].audioSink.ondata = data => {
              var buf = Buffer.from(data.samples.buffer)
              if (this.agents[agentIndex].doRecording)
                this.agents[agentIndex].audioStream.write(buf)
              if (!creatingWatsonSocket && !localSpeachRegconitionReady){
                dumpingFiveFrames--
                console.log("first 3 frame sample rate: " + data.sampleRate)
                if (dumpingFiveFrames <= 0){
                  creatingWatsonSocket = true
                  // call once for testing
                  console.log("third frame sample rate: " + data.sampleRate)
                  console.log("packet len: " + buf.length)
                  //maxFrames = Math.round(32000 / buf.length)
                  //console.log("Max frames: " + maxFrames)
                  this.agents[agentIndex].watson.createWatsonSocket(data.sampleRate, (err, res) => {
                    if (!err) {
                      localSpeachRegconitionReady = true
                      console.log("WatsonSocket created!")
                    }
                  })
                }
              }
              //console.log("sample rate: " + data.sampleRate)
              if (buffer != null){
                  buffer = Buffer.concat([buffer, buf])
              }else
                  buffer = buf
              if (buffer.length > MAXBUFFERSIZE){
                  if (localSpeachRegconitionReady){
                    //console.log("Agent: " + this.agentName)
                    console.log("call transcribe " + buffer.length)
                    this.agents[agentIndex].watson.transcribe(buffer)
                  }else{
                    console.log("Dumping data")
                  }
                  buffer = Buffer.from('')
              }
            }
          })
      })
      this.softphone.on('BYE', sipMessage => {
          console.log("RECEIVE BYE MESSAGE => Hanged up now")
          var agentName = ""
          for (var i=0; i<this.agents.length; i++){
            var agent = this.agents[i]
            if (agent.callId == sipMessage.headers['Call-Id']){
              agentName = agent.name
              this.agents[i].sessionId = ""
              this.agents[i].partyId = ""
              var phoneStatus = {
                agent: agentName,
                status: 'idle'
              }
              server.sendPhoneEvent(phoneStatus)
              console.log("STOP AUDIO SINK FOR " + agentName)
              this.agents[i].audioSink.stop()
              this.agents[i].audioSink = null
              if (agent.doRecording){
                this.agents[i].audioStream.end()
                this.agents[i].audioStream = null
              }
              console.log("Close Watson socket for " + agentName)
              this.agents[i].watson.closeConnection()
              this.agents[i].watson = null
              break
            }
          }

        })
    }catch(e){
        console.log(e)
    }
  },
  storeDeviceId: function (extensionId, deviceId){
      var query = "UPDATE supervision_subscriptionids SET device_id='" + deviceId + "' WHERE ext_id=" + extensionId
      console.log(query)
      pgdb.update(query, (err, result) =>  {
        if (err){
          console.error(err.message);
        }
        console.log("save device_id")
      })
  },
  setAgent: function (agentName, sessionId){
    var agent = {
      name : agentName,
      doRecording : false,
      doTranslation: false,
      sessionId : sessionId,
      callId: "",
      watson: null,
      audioStream: null,
      audioSink: null
    }
    this.agents.push(agent)
    console.log(JSON.stringify(this.agents))
  },
  hangup: function(){

  },
  enableRecording: function(agentName, recording){
    for (var i=0; i<this.agents.length; i++){
      var agent = this.agents[i]
      if (agent.name == agentName){
        this.agents[i].doRecording = recording
        if (recording){
          const audioPath = agentName + this.agents[i].sessionId + '.raw'
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath)
          }
          this.agents[i].audioStream = fs.createWriteStream(audioPath, { flags: 'a' })
        }else{
          this.agents[i].audioStream.close() // end
        }
        break
      }
    }
  },
  enableTranslation: function(agentName, flag) {
    for (var i=0; i<this.agents.length; i++){
      var agent = this.agents[i]
      if (agent.name == agentName){
        this.agents[i].doTranslation = flag
        if (this.agents[i].watson)
          this.agents[i].watson.enableTranslation(flag)
        break
      }
    }
  }
}
module.exports = PhoneEngine;
