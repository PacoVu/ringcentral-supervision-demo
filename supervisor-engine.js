const fs = require('fs')
const pgdb = require('./db')
const { RTCAudioSink } = require('wrtc').nonstandard
const Softphone = require('ringcentral-softphone').default

const WatsonEngine = require('./watson.js');
var server = require('./index')
var MAXBUFFERSIZE = 64000

function PhoneEngine() {
  this.agents = []
  this.softphone = null
  console.log("constructor")
  return this
}

PhoneEngine.prototype = {
  initializePhoneEngine: async function(rcsdk, extensionId){
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
          var headers = sipMessage.headers['p-rc-api-monitoring-ids'].split(";")
          var partyId = headers[0].split("=")[1]
          var agentExtNumber = ""
          var agentIndex = 0
          for (agentIndex=0; agentIndex<this.agents.length; agentIndex++){
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
            this.agents[agentIndex].audioSink = new RTCAudioSink(e.track)
            var buffer = null
            var creatingWatsonSocket = false
            var dumpingFiveFrames = 3
            this.agents[agentIndex].audioSink.ondata = data => {
              if (this.agents[agentIndex].doRecording)
                this.agents[agentIndex].audioStream.write(Buffer.from(data.samples.buffer))
              if (!creatingWatsonSocket && !localSpeachRegconitionReady){
                dumpingFiveFrames--
                if (dumpingFiveFrames <= 0){
                  creatingWatsonSocket = true
                  console.log("third frame sample rate: " + data.sampleRate)
                  if (data.sampleRate < 16000)
                    MAXBUFFERSIZE = 16000

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
                  buffer = Buffer.concat([buffer, Buffer.from(data.samples.buffer)])
              }else
                  buffer = Buffer.from(data.samples.buffer)
              if (buffer.length > MAXBUFFERSIZE){
                  if (localSpeachRegconitionReady){
                    this.agents[agentIndex].watson.transcribe(buffer)
                  }else{
                    console.log("Dumping data")
                  }
                  buffer = null
              }
            }
          })
      })
      this.softphone.on('BYE', sipMessage => {
        console.log("RECEIVE BYE MESSAGE => Hanged up now")
        var i = 0
        for (i=0; i<this.agents.length; i++){
          var agent = this.agents[i]
          if (agent.callId == sipMessage.headers['Call-Id']){
            this.agents[i].sessionId = ""
            this.agents[i].partyId = ""
            var phoneStatus = { agent: agent.agentExtNumber, status: 'ready' }
            server.sendPhoneEvent(phoneStatus)
            this.agents[i].audioSink.stop()
            this.agents[i].audioSink = null
            if (agent.doRecording){
              this.agents[i].audioStream.end()
              this.agents[i].audioStream = null
            }
            var thisClass = this
            setTimeout(function () {
              thisClass.agents[i].watson.closeConnection()
              thisClass.agents[i].watson = null
            }, 15000, i)
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
          this.agents[i].audioStream.close()
        }
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
/*
softphone.on('INVITE', sipMessage => {
  softphone.answer(sipMessage)
  softphone.once('track', e => {
    const audioSink = new RTCAudioSink(e.track)
    audioSink.ondata = data => {
      console.log("Sample rate: " + data.sampleRate)
      var buffer = Buffer.from(data.samples.buffer)
    }
  })
})

this.softphone.on('BYE', sipMessage => {
  // reset resource
})
*/
