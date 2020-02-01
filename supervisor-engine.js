require('dotenv').config()
const RingCentral = require('@ringcentral/sdk').SDK
const fs = require('fs')
const pgdb = require('./db')
const { RTCAudioSink } = require('wrtc').nonstandard
const Softphone = require('ringcentral-softphone').default

const WatsonEngine = require('./watson.js');
var server = require('./index')
var MAXBUFFERSIZE = 64000
// playback recording
// play -c 1 -r 16000 -e signed -b 16 audio.raw

function PhoneEngine() {
  this.agents = []
  this.softphone = null
  console.log("constructor")
  return this
}

PhoneEngine.prototype = {
  initializePhoneEngine: async function(rcsdk, extensionId){
    console.log("initializePhoneEngine")
    if (this.softphone){
      console.log("Has been initialized")
      return
    }
    this.softphone = new Softphone(rcsdk)
    try {
        await this.softphone.register()
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
          //console.log(sipMessage)
          var headers = sipMessage.headers['p-rc-api-monitoring-ids'].split(";")
          //var headers = sipMessage.headers['p-rc-api-ids'].split(";")
          //var sessionId = headers[1].split("=")[1]
          //console.log("Session id: " + sessionId)
          var partyId = headers[0].split("=")[1]
          //console.log("Party id: " + partyId)

          var agentExtNumber = ""
          var agentIndex = 0
          for (agentIndex=0; agentIndex<this.agents.length; agentIndex++){
            //console.log(this.agents[agentIndex].sessionId + " === " + sessionId)
            //console.log(this.agents[agentIndex].partyId + " === " + partyId)
            if (this.agents[agentIndex].partyId == partyId){
              agentExtNumber = this.agents[agentIndex].agentExtNumber
              this.agents[agentIndex].callId = sipMessage.headers['Call-Id']
              this.agents[agentIndex].watson = new WatsonEngine(agentExtNumber, this.agents[agentIndex].speakerName, this.agents[agentIndex].speakerId, this.agents[agentIndex].language)
              this.softphone.answer(sipMessage)
              var phoneStatus = {
                agent: this.agents[agentIndex].agentExtNumber,
                status: 'connected'
              }
              server.sendPhoneEvent(phoneStatus)
              break
            }
          }
          var localSpeachRegconitionReady = false

          this.softphone.once('track', e => {
            console.log("GET TRACK")
            //console.log(e)
            this.agents[agentIndex].audioSink = new RTCAudioSink(e.track)
            var buffer = null
            var creatingWatsonSocket = false
            var dumpingFiveFrames = 3
            this.agents[agentIndex].audioSink.ondata = data => {
              var buf = Buffer.from(data.samples.buffer)
              if (this.agents[agentIndex].doRecording)
                this.agents[agentIndex].audioStream.write(buf)
              if (!creatingWatsonSocket && !localSpeachRegconitionReady){
                dumpingFiveFrames--
                if (dumpingFiveFrames <= 0){
                  creatingWatsonSocket = true
                  // call once for testing
                  console.log("third frame sample rate: " + data.sampleRate)
                  console.log("packet len: " + buf.length)
                  if (data.sampleRate < 16000)
                    MAXBUFFERSIZE = 32000
                  this.agents[agentIndex].watson.createWatsonSocket(data.sampleRate, (err, res) => {
                    if (!err) {
                      localSpeachRegconitionReady = true
                      console.log("WatsonSocket created! " + res)
                    }else{
                      console.log("WatsonSocket creation failed!!!!!")
                    }
                  })
                }
              }

              if (buffer != null){
                  buffer = Buffer.concat([buffer, buf])
              }else
                  buffer = buf
              if (buffer.length > MAXBUFFERSIZE){
                  if (localSpeachRegconitionReady){
                    this.agents[agentIndex].watson.transcribe(buffer)
                    //console.log("Buffer is filled but not sending")
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
          //console.log(sipMessage)
          var thisClass = this
          var agentExtNumber = ""
          var speakerName = ""
          var i = 0
          for (i=0; i<thisClass.agents.length; i++){
              var agent = thisClass.agents[i]
              if (agent.callId == sipMessage.headers['Call-Id']){
                agentExtNumber = agent.agentExtNumber
                speakerName = agent.speakerName
                this.agents[i].sessionId = ""
                this.agents[i].partyId = ""
                var phoneStatus = {
                  agent: agentExtNumber,
                  status: 'idle'
                }
                server.sendPhoneEvent(phoneStatus)
                console.log("STOP AUDIO SINK FOR " + speakerName)
                thisClass.agents[i].audioSink.stop()
                thisClass.agents[i].audioSink = null
                if (agent.doRecording){
                  thisClass.agents[i].audioStream.end()
                  thisClass.agents[i].audioStream = null
                }

                setTimeout(function () {
                  console.log("Index " + i)
                  console.log("After delays. Close Watson socket for " + speakerName)
                  thisClass.agents[i].watson.closeConnection()
                  thisClass.agents[i].watson = null
                  //console.log("CHECK agents len: " + thisClass.agents.length)
                }, 15000, i, speakerName)
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
  getAgentStatus: function(agentExtNumber){

  },
  setAgent: function (agentObj){
    var agent = {
      agentExtNumber : agentObj.agentExtNumber,
      speakerName: agentObj.speakerName,
      speakerId: agentObj.speakerId,
      language: agentObj.language,
      doRecording : false,
      doTranslation: false,
      sessionId : agentObj.sessionId,
      partyId : agentObj.partyId,
      callId: "",
      watson: null,
      audioStream: null,
      audioSink: null
    }
    var addNewAgent = true
    for (var i=0; i<this.agents.length; i++){
      var existingAgent = this.agents[i]
      if (existingAgent.agentExtNumber == agent.agentExtNumber && existingAgent.speakerId == agent.speakerId){
        this.agents[i] = agent
        addNewAgent = false
        break
      }
    }
    if (addNewAgent)
      this.agents.push(agent)
    //console.log(JSON.stringify(this.agents))
  },
  hangup: function(){

  },
  enableRecording: function(agentNumber, recording){
    for (var i=0; i<this.agents.length; i++){
      var agent = this.agents[i]
      if (agent.agentExtNumber == agentNumber){
        this.agents[i].doRecording = recording
        var date = new Date().toISOString()
        if (recording){
          const audioPath = agentNumber + "_" + this.agents[i].speakerId + "_" + date + '.raw'
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath)
          }
          this.agents[i].audioStream = fs.createWriteStream(audioPath, { flags: 'a' })
        }else{
          this.agents[i].audioStream.close() // end
        }
        //break
      }
    }
  },
  enableTranslation: function(agentExtNumber, flag) {
    for (var i=0; i<this.agents.length; i++){
      var agent = this.agents[i]
      if (agent.agentExtNumber == agentExtNumber){
        this.agents[i].doTranslation = flag
        if (this.agents[i].watson != null){
          this.agents[i].watson.enableTranslation(flag)
        }
      }
    }
  }
}
module.exports = PhoneEngine;
