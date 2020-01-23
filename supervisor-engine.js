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
  this.watson = new WatsonEngine("120")
  //this.speachRegconitionReady = false
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

    if (this.softphone){
      var phoneStatus = {
        agent: "120",
        status: 'online'
      }
      server.sendPhoneEvent(phoneStatus)
      return
    }

    var query = "SELECT tokens from supervision_subscriptionids WHERE ext_id=1000012"
    var thisClass = this
    pgdb.read(query, async (err, result) => {
        if (!err){
            if (result.rows.length){
                var row = result.rows[0]
                if (row['tokens'] != ""){
                  var tokensObj = JSON.parse(row['tokens'])
                  await thisClass.rcsdk.platform().auth().setData(tokensObj)
                  var isLoggedin = await thisClass.rcsdk.platform().ensureLoggedIn()
                  /*
                  console.log("everything is okay: " + isLoggedin)
                  if (!isLoggedin){
                    console.log("FORCE TO RELOGIN !!!")
                    await thisClass.login()
                  }
                  */
                }else{
                  await thisClass.login()
                }
            }else{
                console.log("no row => call login")
                console.log("FORCE TO LOGIN !!!")
                await thisClass.login("")
            }
        }
    })
    //console.log("THIS IS AGENT " + this.agentName)
    console.log("initialize")
    this.softphone = new Softphone(this.rcsdk)
    console.log("passed create softphone")
    try {
        await this.softphone.register()
        console.log("passed registered softphone")
        this.deviceId = this.softphone.device.id
        console.log("Registered deviceId: " + this.deviceId)
        saveDeviceId(this.deviceId)
        var phoneStatus = {
          agent: "120",
          status: 'online'
        }
        server.sendPhoneEvent(phoneStatus)
        let audioSink

        this.softphone.on('INVITE', sipMessage => {
          console.log("GOT INVITED")
          console.log(sipMessage.headers['Call-Id'])
          var headers = sipMessage.headers['p-rc-api-ids'].split(";")
          var sessionId = headers[1].split("=")[0]
          console.log("Party id: " + headers[0])
          console.log("Session id: " + headers[1])
          var agentName = ""
          for (var i=0; i<this.agents.length; i++){
            var agent = this.agents[i]
            if (agent.sessionId == sessionId){
              agentName = agent.name
              this.agents[i].callId = sipMessage.headers['Call-Id']
              break
            }
          }
          var localSpeachRegconitionReady = false
          //this.watson = new WatsonEngine(agentName)
          //console.log("Headers: " + sipMessage.headers['p-rc-api-ids'])
          var maxFrames = 60
          this.softphone.answer(sipMessage)
          var phoneStatus = {
            agent: this.agents[0].name,
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

              if (!creatingWatsonSocket && !localSpeachRegconitionReady){
                creatingWatsonSocket = true
                // call once for testing
                console.log("sample rate: " + data.sampleRate)
                console.log("packet len: " + buf.length)
                maxFrames = Math.round(32000 / buf.length)
                console.log("Max frames: " + maxFrames)
                // test end
                this.watson.createWatsonSocket(data.sampleRate, (err, res) => {
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
              break
            }
          }
          var phoneStatus = {
            agent: agentName,
            status: 'idle'
          }
          server.sendPhoneEvent(phoneStatus)
          audioSink.stop()
          if (this.doRecording)
            this.audioStream.end()
          console.log("Close Watson socket.")
          this.watson.closeConnection()
          this.speachRegconitionReady = false
        })
    }catch(e){
        console.log(e)
    }
  },
  login: async function (){
    console.log("FORCE TO LOGIN !!!")
    try{
      await rcsdk.login({
        username: process.env.RINGCENTRAL_USERNAME,
        extension: process.env.RINGCENTRAL_EXTENSION,
        password: process.env.RINGCENTRAL_PASSWORD
      })
      console.log("after login")
      const data = await rcsdk.platform().auth().data()
      //console.log(JSON.stringify(data))
      var query = "UPDATE supervision_subscriptionids SET tokens='" + JSON.stringify(data) + "', WHERE ext_id=1000012"
      console.log("SUB ID: " + query)
      pgdb.update(query, (err, result) =>  {
        if (err){
          console.error(err.message);
        }
        console.log("save tokens")
      })
    }catch(e){
      console.log("LOGIN FAILED")
    }
  },
  setAgent: function (agentName, sessionId){
    var agent = {
      name : agentName,
      doRecording : false,
      doTranslation: false,
      sessionId : sessionId,
      callId: ""
    }
    this.agents.push(agent)
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
          this.audioStream = fs.createWriteStream(audioPath, { flags: 'a' })
        }else{
          this.doRecording = false
          this.audioStream.close() // end
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
