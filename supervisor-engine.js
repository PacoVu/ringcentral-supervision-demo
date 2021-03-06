const fs = require('fs')
const pgdb = require('./db')
const { RTCAudioSink } = require('wrtc').nonstandard
const Softphone = require('ringcentral-softphone').default

const WatsonEngine = require('./watson.js');
var server = require('./index')
var MAXBUFFERSIZE = 32000

function PhoneEngine() {
  this.channels = []
  this.softphone = null
  this.deviceId = ""
  return this
}

PhoneEngine.prototype = {
  initializePhoneEngine: async function(rcsdk){
    if (this.softphone){
      console.log("Has been initialized")
      return
    }
    this.softphone = new Softphone(rcsdk)
    try {
        console.log("CREATE SP REGISTER?")
        await this.softphone.register()
        this.deviceId = this.softphone.device.id
        server.sendPhoneEvent('ready')

        this.softphone.on('INVITE', sipMessage => {
          console.log("SIP Invite")
          console.log("p-rc-api-ids " + sipMessage.headers['p-rc-api-ids'])
          console.log("p-rc-api-monitoring-ids " + sipMessage.headers['p-rc-api-monitoring-ids'])
          var headers = sipMessage.headers['p-rc-api-monitoring-ids'].split(";")
          //var headers = sipMessage.headers['p-rc-api-ids'].split(";")
          var partyId = headers[0].split("=")[1]
          var channelIndex = 0
          for (channelIndex=0; channelIndex<this.channels.length; channelIndex++){
            if (this.channels[channelIndex].partyId == partyId){
              this.channels[channelIndex].callId = sipMessage.headers['Call-Id']
              this.channels[channelIndex].watson = new WatsonEngine(this.channels[channelIndex].speakerName, this.channels[channelIndex].speakerId)
              this.softphone.answer(sipMessage)
              server.sendPhoneEvent('connected')
              break
            }
          }
          var localSpeachRegconitionReady = false
          this.softphone.once('track', e => {
            this.channels[channelIndex].audioSink = new RTCAudioSink(e.track)
            var buffer = null
            var creatingWatsonSocket = false
            var dump3Frames = 3
            this.channels[channelIndex].audioSink.ondata = data => {
              if (this.channels[channelIndex].doRecording)
                this.channels[channelIndex].audioStream.write(Buffer.from(data.samples.buffer))
              if (!creatingWatsonSocket && !localSpeachRegconitionReady){
                dump3Frames--
                if (dump3Frames <= 0){
                  creatingWatsonSocket = true
                  console.log("third frame sample rate: " + data.sampleRate)
                  //if (data.sampleRate < 16000)
                  //  MAXBUFFERSIZE = 8000 // Have to limit to 16K for running on heroku low memory!

                  this.channels[channelIndex].watson.createWatsonSocket(data.sampleRate, (err, res) => {
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
                    this.channels[channelIndex].watson.transcribe(buffer)
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
        //console.log(sipMessage.headers)
        var i = 0
        for (i=0; i<this.channels.length; i++){
          var agent = this.channels[i]
          if (agent.callId == sipMessage.headers['Call-Id']){
            this.channels[i].partyId = ""
            server.sendPhoneEvent('ready')
            this.channels[i].audioSink.stop()
            this.channels[i].audioSink = null
            if (agent.doRecording){
              this.channels[i].audioStream.end()
              this.channels[i].audioStream = null
            }
            var thisClass = this
            setTimeout(function () {
              thisClass.channels[i].watson.closeConnection()
              thisClass.channels[i].watson = null
              //thisClass.channels.splice(i, 1);
            }, 15000, i)
            break
          }
        }
      })
    }catch(e){
      console.log("FAILED REGISTER?")
      console.log(e)
    }
  },
  setChannel: function (agentObj){
    var channel = {
      speakerName: agentObj.speakerName,
      speakerId: agentObj.speakerId,
      doRecording : false,
      doTranslation: false,
      partyId : agentObj.partyId,
      callId: "",
      watson: null,
      audioStream: null,
      audioSink: null
    }
    this.channels.push(channel)
  },
  enableRecording: function(recording){
    for (var i=0; i<this.channels.length; i++){
      this.channels[i].doRecording = recording
      var date = new Date().toISOString()
      if (recording){
          var audioPath = ""
          if (this.channels[i].speakerId == 0)
            audioPath = "Customer_"
          else
            audioPath = "Agent_"
          audioPath += date + '.raw'
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath)
          }
          this.channels[i].audioStream = fs.createWriteStream(audioPath, { flags: 'a' })
      }else{
          this.channels[i].audioStream.close()
      }
    }
  },
  enableTranslation: function(flag) {
    for (var i=0; i<this.channels.length; i++){
      this.channels[i].doTranslation = flag
      if (this.channels[i].watson != null){
          this.channels[i].watson.enableTranslation(flag)
      }
    }
  }
}
module.exports = PhoneEngine;
