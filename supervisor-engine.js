const fs = require('fs')
const { RTCAudioSink } = require('wrtc').nonstandard
const Softphone = require('ringcentral-softphone').default

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
        console.log(this.deviceId)
        console.log("Supervisor Ready!")

        this.softphone.on('INVITE', sipMessage => {
          console.log("SIP Invite")
          //console.log("p-rc-api-ids " + sipMessage.headers['p-rc-api-ids'])
          //console.log("p-rc-api-monitoring-ids " + sipMessage.headers['p-rc-api-monitoring-ids'])
          var headers = sipMessage.headers['p-rc-api-monitoring-ids'].split(";")
          //var headers = sipMessage.headers['p-rc-api-ids'].split(";")
          var partyId = headers[0].split("=")[1]
          var channelIndex = 0
          for (channelIndex=0; channelIndex<this.channels.length; channelIndex++){
            if (this.channels[channelIndex].partyId == partyId){
              this.channels[channelIndex].callId = sipMessage.headers['Call-Id']
              this.softphone.answer(sipMessage)
              console.log("Recording ...")
              break
            }
          }
          var localSpeachRegconitionReady = false
          this.softphone.once('track', e => {
            this.channels[channelIndex].audioSink = new RTCAudioSink(e.track)
            this.channels[channelIndex].audioSink.ondata = data => {
              if (this.channels[channelIndex] != undefined)
                this.channels[channelIndex].audioStream.write(Buffer.from(data.samples.buffer))
            }
          })
      })
      this.softphone.on('BYE', sipMessage => {
        console.log("RECEIVE BYE MESSAGE => Hanged up now")
        console.log("Stop recording!")
        var i = 0
        for (i=0; i<this.channels.length; i++){
          var agent = this.channels[i]
          if (agent.callId == sipMessage.headers['Call-Id']){
            console.log(`Call callId: ${agent.callId}`)
            console.log(`Call party id: ${this.channels[i].partyId}`)
            console.log(`Speaker name: ${this.channels[i].speakerName}`)
            this.channels[i].audioSink.stop()
            this.channels[i].audioSink = null
            this.channels[i].audioStream.end()
            this.channels[i].audioStream.close()
            this.channels[i].audioStream = null
            /*
            var thisObj = this
            setTimeout(function(i) {
              thisObj.channels.splice(i, 1)
            }, 2000)
            */
            this.channels.splice(i, 1)
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
    var date = new Date().toISOString()
    date = date.replace(/\//g, "-")
    var audioPath = ""
    if (agentObj.speakerId == 0)
        audioPath = `Customer_${agentObj.partyId}.raw`
    else
        audioPath = `Agent_${agentObj.partyId}.raw`
    //audioPath += date + '.raw'
    if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath)
    }
    var channel = {
      speakerName: agentObj.speakerName,
      speakerId: agentObj.speakerId,
      partyId : agentObj.partyId,
      callId: "",
      audioStream: fs.createWriteStream(audioPath, { flags: 'a' }),
      audioSink: null
    }
    this.channels.push(channel)
  },
  getChannel: function(partyId){
    var channel = this.channels.find(o => o.partyId === partyId)
    return channel
  },
  removeChannel: function(partyId){
    var channelIndex = this.channels.findIndex(o => o.partyId === partyId)
    if (channelIndex >= 0){
      this.channels.splice(channelIndex, 1)
      console.log("channel removed")
    }
  }
}
module.exports = PhoneEngine;

// play -e signed -b 16 -c 1 -r 8000 xxx.raw
