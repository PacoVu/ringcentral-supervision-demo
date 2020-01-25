require('dotenv').config()
const RingCentral = require('@ringcentral/sdk').SDK
const fs = require('fs')
const pgdb = require('./db')
const { RTCAudioSink } = require('wrtc').nonstandard
const Softphone = require('ringcentral-softphone').default

const WatsonEngine = require('./watson.js');
var server = require('./index')

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
  this.deviceId = ""
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
  initializePhoneEngine: async function(rcsdk){
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
        this.deviceId = this.softphone.device.id
        console.log("Registered deviceId: " + this.deviceId)
        saveDeviceId(this.deviceId)
        for (var agent of this.agents){
          var phoneStatus = {
            agent: agent.name,
            status: 'ready'
          }
          server.sendPhoneEvent(phoneStatus)
        }

        //let audioSink

        this.softphone.on('INVITE', sipMessage => {
          console.log("GOT INVITED")
          console.log(sipMessage.headers['Call-Id'])
          var headers = sipMessage.headers['p-rc-api-ids'].split(";")
          var sessionId = headers[1].split("=")[1]
          console.log("Party id: " + headers[0])
          console.log("Session id: " + headers[1])
          var agentName = ""
          var agent = null
          for (var i=0; i<this.agents.length; i++){
            agent = this.agents[i]
            console.log(agent.sessionId + " === " + sessionId)
            if (agent.sessionId == sessionId){
              agentName = agent.name
              this.agents[i].callId = sipMessage.headers['Call-Id']
              this.softphone.answer(sipMessage)
              var phoneStatus = {
                agent: agent.name,
                status: 'connected'
              }
              server.sendPhoneEvent(phoneStatus)
              break
            }
          }
          var localSpeachRegconitionReady = false
          var watson = new WatsonEngine(agentName)
          agent.watson = watson
          let audioSink

          var maxFrames = 60

          this.softphone.once('track', e => {
            audioSink = new RTCAudioSink(e.track)
            agent.audioSink = audioSink
            var frames = 0
            var buffer = null
            var creatingWatsonSocket = false
            audioSink.ondata = data => {
              var buf = Buffer.from(data.samples.buffer)
              if (agent.doRecording)
                //this.audioStream.write(Buffer.from(data.samples.buffer))
                agent.audioStream.write(buf)

              if (!creatingWatsonSocket && !localSpeachRegconitionReady){
                creatingWatsonSocket = true
                // call once for testing
                console.log("sample rate: " + data.sampleRate)
                console.log("packet len: " + buf.length)
                maxFrames = Math.round(32000 / buf.length)
                console.log("Max frames: " + maxFrames)
                // test end
                watson.createWatsonSocket(data.sampleRate, (err, res) => {
                  if (!err) {
                    localSpeachRegconitionReady = true
                    console.log("WatsonSocket created!")
                  }
                })
              }

              if (buffer != null){
                  buffer = Buffer.concat([buffer, buf])
                  //console.log("concated buffer length: " + buffer.length)
              }else
                  buffer = buf
              //frames++
              //if (frames >= maxFrames){
              if (buffer.length > 32000){
                  //console.log("call transcribe")
                  //console.log("maxFrames: " + maxFrames)
                  //console.log(`live audio data received, sample rate is ${data.sampleRate}`)
                  if (localSpeachRegconitionReady){
                    //console.log("Agent: " + this.agentName)
                    console.log("call transcribe " + buffer.length)
                    watson.transcribe(buffer)
                  }else{
                    console.log("Dumping data")
                  }
                  buffer = Buffer.from('')
                  frames=0
              }
            }
          })
      })
      this.softphone.on('BYE', sipMessage => {
          console.log("RECEIVE BYE MESSAGE => Hanged up now")
          console.log(sipMessage.headers['Call-Id'])
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
              this.agents[i].audioSink.stop()
              if (agent.doRecording)
                this.agents[i].audioStream.end()
              console.log("Close Watson socket.")
              this.agents[i].watson.closeConnection()
              //this.speachRegconitionReady = false
              break
            }
          }

        })
    }catch(e){
        console.log(e)
    }
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
          const audioPath = agentName + '.raw'
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath)
          }
          this.agents[i].audioStream = fs.createWriteStream(audioPath, { flags: 'a' })
        }else{
          //this.agents[i].doRecording = false
          this.agents[i].audioStream.close() // end
        }
        break
      }
    }
  },

  handleCallRecording: function (recoringState){
    console.log("recoringState: " + recoringState)
  },
  enableTranslation: function(agentName, flag) {
    for (var i=0; i<this.agents.length; i++){
      var agent = this.agents[i]
      if (agent.name == agentName){
        this.agents[i].doTranslation = flag
        if (this.watson)
          this.watson.enableTranslation(flag)
        break
      }
    }
  }
}
module.exports = PhoneEngine;

function saveDeviceId(deviceId){
  try {
    fs.writeFile("deviceId.txt", deviceId, function(err) {
        if(err)
            console.log(err);
        else
            console.log("deviceId " + deviceId + " is saved.");
    });
  }catch (e){
    console.log("WriteFile err")
  }
}
