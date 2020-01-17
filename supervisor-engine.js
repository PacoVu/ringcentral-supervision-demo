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

function PhoneEngine(agentName) {
  this.agentName = agentName
  this.watson = new WatsonEngine(agentName)
  this.speachRegconitionReady = false
  this.doRecording = false
  this.audioStream = null
  this.softphone = null
  this.deviceId = ""
  this.rcsdk = new RingCentral({
    server: process.env.RINGCENTRAL_SERVER_URL,
    clientId: process.env.RINGCENTRAL_CLIENT_ID,
    clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
  })
  console.log("constructor")
  return this
}

PhoneEngine.prototype = {
  initializePhoneEngine: async function(){
    console.log("initializePhoneEngine")
    if (this.softphone)
      return

    if (fs.existsSync("access_tokens.txt")) {
        console.log("reuse access tokens")
        var saved_tokens = fs.readFileSync("access_tokens.txt", 'utf8');
        var tokensObj = JSON.parse(saved_tokens)
        await this.rcsdk.platform().auth().setData(tokensObj)
        var isLoggedin = await this.rcsdk.platform().loggedIn()
        if (!isLoggedin){
          console.log("RELOGIN ???")
          await this.rcsdk.login({
            username: process.env.RINGCENTRAL_USERNAME,
            extension: process.env.RINGCENTRAL_EXTENSION,
            password: process.env.RINGCENTRAL_PASSWORD
          })
        }
    }else{
      await this.rcsdk.login({
        username: process.env.RINGCENTRAL_USERNAME,
        extension: process.env.RINGCENTRAL_EXTENSION,
        password: process.env.RINGCENTRAL_PASSWORD
      })
    }
    /*
    await this.rcsdk.login({
      username: process.env.RINGCENTRAL_USERNAME,
      extension: process.env.RINGCENTRAL_EXTENSION,
      password: process.env.RINGCENTRAL_PASSWORD
    })
    */
    console.log("THIS IS AGENT " + this.agentName)
    console.log("initialize")
    this.softphone = new Softphone(this.rcsdk, this.agentName)
    console.log("passed create softphone")
    try {
        await this.softphone.register()
        console.log("passed registered softphone")
        this.deviceId = this.softphone.device.id
        console.log("Registered deviceId: " + this.deviceId)
        saveDeviceId(this.deviceId)
        var phoneStatus = {
          agent: this.agentName,
          status: 'online'
        }
        server.sendPhoneEvent(phoneStatus)
        let audioSink

        this.softphone.on('INVITE', sipMessage => {
          console.log("GOT INVITED")
          console.log("Headers: " + sipMessage.headers['p-rc-api-ids'])
          var maxFrames = 60
          this.softphone.answer(sipMessage)
          var phoneStatus = {
            agent: this.agentName,
            status: 'connected'
          }
          server.sendPhoneEvent(phoneStatus)
          this.softphone.once('track', e => {
            audioSink = new RTCAudioSink(e.track)
            var frames = 0
            var buffer = null
            var creatingWatsonSocket = false
            audioSink.ondata = data => {
              var buf = Buffer.from(data.samples.buffer)
              if (this.doRecording)
                //this.audioStream.write(Buffer.from(data.samples.buffer))
                this.audioStream.write(buf)

              if (!creatingWatsonSocket && !this.speachRegconitionReady){
                creatingWatsonSocket = true
                // call once for testing
                console.log("sample rate: " + data.sampleRate)
                console.log("packet len: " + buf.length)
                maxFrames = Math.round(32000 / buf.length)
                console.log("Max frames: " + maxFrames)
                // test end
                this.watson.createWatsonSocket(data.sampleRate, (err, res) => {
                  if (!err) {
                    this.speachRegconitionReady = true
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
                  if (this.speachRegconitionReady){
                    //console.log("Agent: " + this.agentName)
                    console.log("call transcribe " + buffer.length)
                    this.watson.transcribe(buffer)
                  }else{
                    console.log("Dumping data")
                  }
                  buffer = Buffer.from('')
                  frames=0
              }
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
          var phoneStatus = {
            agent: this.agentName,
            status: 'idle'
          }
          server.sendPhoneEvent(phoneStatus)
        })
    }catch(e){
        console.log(e)
    }
  },
  hangup: function(){

  },
  enableRecording: function(recording){
    if (recording){
      const audioPath = this.agentName + '.raw'
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
