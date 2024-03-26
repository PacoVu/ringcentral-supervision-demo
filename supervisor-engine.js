const fs = require('fs')
const RtpPacket = require('werift-rtp')
const Softphone = require('ringcentral-softphone').default

const WatsonEngine = require('./watson.js');
var server = require('./index')
var MAXBUFFERSIZE = 12000

function PhoneEngine() {
  this.channels = []
  this.softphone = null
  return this
}

PhoneEngine.prototype = {
  initializePhoneEngine: async function(){
    this.softphone = new Softphone({
      username: process.env.SIP_INFO_USERNAME,
      password: process.env.SIP_INFO_PASSWORD,
      authorizationId: process.env.SIP_INFO_AUTHORIZATION_ID,
    });

    if (this.softphone){
      console.log("Has been initialized")
    }else{
      console.log("SP initialization failed")
      return
    }

    try {
      await this.softphone.register();
      server.sendPhoneEvent('ready')
      // detect inbound call
      this.softphone.on('invite', async (sipMessage) => {

        console.log("SIP Invite")
        var headers = sipMessage.headers['p-rc-api-ids'].split(";")
        if (sipMessage.headers['p-rc-api-monitoring-ids']){
          console.log("p-rc-api-monitoring-ids ", sipMessage.headers['p-rc-api-monitoring-ids'])
          headers = sipMessage.headers['p-rc-api-monitoring-ids'].split(";")
        }

        var partyId = headers[0].split("=")[1]
        var channelIndex = 0

        for (channelIndex=0; channelIndex<this.channels.length; channelIndex++){
          if (this.channels[channelIndex].partyId == partyId){
            this.channels[channelIndex].callId = sipMessage.headers['Call-Id']
            this.channels[channelIndex].watson = new WatsonEngine(this.channels[channelIndex].speakerName, this.channels[channelIndex].speakerId)
            break
          }
        }

        // answer the call
        this.channels[channelIndex].callSession = await this.softphone.answer(sipMessage);
        server.sendPhoneEvent('connected')

        // receive audio
        var buffer = null
        var watsonSpeachRegconitionReady = false

        // Create Watson engine
        this.channels[channelIndex].watson.createWatsonSocket(8000, (err, res) => {
            if (!err) {
              watsonSpeachRegconitionReady = true
              console.log("WatsonSocket created! " + res)
            }else{
              console.log("WatsonSocket creation failed!!!!!")
            }
        })

        this.channels[channelIndex].callSession.on('audioPacket', (rtpPacket) => {
            if (this.channels[channelIndex].doRecording)
                this.channels[channelIndex].audioStream.write(rtpPacket.payload)

            if (buffer != null){
                buffer = Buffer.concat([buffer, Buffer.from(rtpPacket.payload)])
            }else{
                buffer = Buffer.from(rtpPacket.payload)
            }
            if (buffer.length > MAXBUFFERSIZE){
                if (watsonSpeachRegconitionReady){
                  this.channels[channelIndex].watson.transcribe(buffer)
                }else{
                  console.log(`Dumping data of party ${this.channels[channelIndex].partyId} / ${this.channels[channelIndex].speakerName}`)
                }
                buffer = null
            }
        });

        // Either the agent or the customer hang up
        this.channels[channelIndex].callSession.once('disposed', () => {
          console.log("RECEIVE BYE MESSAGE => Hanged up now for this channel:")
          console.log("Stop recording!")

          console.log(`Agent callId: ${this.channels[channelIndex].callId}`)
          console.log(`Agent party id: ${this.channels[channelIndex].partyId}`)
          server.sendPhoneEvent('ready')
          if (this.channels[channelIndex].doRecording){
                this.channels[channelIndex].audioStream.end()
                this.channels[channelIndex].audioStream.close()
                this.channels[channelIndex].audioStream = null
          }

          var thisClass = this
          setTimeout(function (partyId) {
            var index = thisClass.channels.findIndex( c => c.partyId === partyId)
            if (index >= 0){
              thisClass.channels[index].watson.closeConnection()
              thisClass.channels[index].watson = null
              thisClass.channels.splice(index, 1)
            }
          }, 10000, this.channels[channelIndex].partyId)
        });
      });
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
      callSession: null,
      audioStream: null
    }
    this.channels.push(channel)
  },
  enableRecording: function(recording){
    console.log("enableRecording", recording)
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
