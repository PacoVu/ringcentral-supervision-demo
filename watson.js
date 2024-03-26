const server = require('./index')
const WS = require('ws')
const request = require('request')
const TranslatorV3 = require('ibm-watson/language-translator/v3');
const NLUnderstandingV1 = require("ibm-watson/natural-language-understanding/v1")
const { IamAuthenticator } = require('ibm-watson/auth');

var fiftynineMinute = 59
var english_language_model = 'en-US_NarrowbandModel'
var eng_wsURI = '';


getWatsonToken()

setInterval(function(){
  fiftynineMinute--
  if (fiftynineMinute <= 1){
    getWatsonToken()
    fiftynineMinute = 59
    console.log("refresh watson token")
  }
}, 60000)

function getWatsonToken(){
  const wsURI = `wss://api.us-south.speech-to-text.watson.cloud.ibm.com/instances/${process.env.STT_INSTANCE_ID}/v1/recognize?access_token=`
  console.log(wsURI)
  request.post("https://iam.cloud.ibm.com/identity/token", {
    form:
      { grant_type:'urn:ibm:params:oauth:grant-type:apikey',
        apikey: process.env.WATSON_SPEECH2TEXT_API_KEY
      }
    },
    function(error, response, body) {
      var jsonObj = JSON.parse(body)
      eng_wsURI = wsURI + jsonObj.access_token + '&model=en-US_NarrowbandModel'
    });
}

//
function WatsonEngine(speakerName, speakerId) {
  this.doTranslation = false
  this.ws = null
  this.speakerId = speakerId
  this.NLUnderstanding = undefined

  this.NLUnderstanding = new NLUnderstandingV1({
    version: '2022-04-07',
    authenticator: new IamAuthenticator({
      apikey: process.env.WATSON_NLU_API_KEY,
    }),
    serviceUrl: `https://api.us-south.natural-language-understanding.watson.cloud.ibm.com/instances/${process.env.NLU_INSTANCE_ID}`,
  });


  this.translator = new TranslatorV3({
    version: '2018-05-01',
    authenticator: new IamAuthenticator({
      apikey: process.env.WATSON_LANGUAGE_TRANSLATION_API_KEY,
    }),
    serviceUrl: `https://api.us-south.language-translator.watson.cloud.ibm.com/instances/${process.env.LT_INSTANCE_ID}`,
  });


  this.sentimentScore = 0
  this.sentimentCount = 1

  this.emotionCount = 1
  this.sadnessScore = 0
  this.joyScore = 0
  this.fearScore = 0
  this.disgustScore = 0
  this.angerScore = 0

  this.keywords = []

  this.transcript = {
    name: speakerName,
    id: speakerId,
    index: 0,
    timestamp: "xx.xx",
    final: false,
    text: "",
    translation: "",
    sentenceSentimentScore: 0,
    wordCount: 0,
    analysis: {
      sentimentScore: 0,
      sadnessScore: 0,
      joyScore: 0,
      fearScore: 0,
      disgustScore: 0,
      angerScore: 0
    }
  }
  return this
}

WatsonEngine.prototype = {
  createWatsonSocket: function(sampleRate, callback){
    this.ws = new WS(eng_wsURI);
    var configs = {
      'action': 'start',
      'content-type': `audio/mulaw;rate=${sampleRate};channels=1`,
      'timestamps': false,
      'interim_results': true,
      'inactivity_timeout': -1,
      'smart_formatting': true,
      'speaker_labels': false
    };

    var thisClass = this
    this.ws.onopen = function(evt) {
      console.log("Watson Socket open")
      thisClass.ws.send(JSON.stringify(configs));
      callback(null, "READY")
    };

    this.ws.onclose = function(data) {
      console.log("Watson Socket closed.")
    };
    this.ws.onconnection = function(evt) {
      console.log("Watson Socket connected.")
    };

    this.ws.onerror = function(evt) {
      console.log("Watson Socket error.")
      console.log(evt)
      callback(evt, "")
    };
    this.ws.on('message', function(evt) {
      var res = JSON.parse(evt)
      if (res.hasOwnProperty('results')){
        thisClass.transcript.index = res.result_index
        thisClass.transcript.timestamp = "xx:xx"
        thisClass.transcript.final = res.results[0].final
        thisClass.transcript.text = res.results[0].alternatives[0].transcript
        thisClass.transcript.sentenceSentimentScore = 0

        if (res.results[0].final){
          var text = res.results[0].alternatives[0].transcript
          text = text.trim()
          var wordCount = text.split(" ").length
          thisClass.transcript.wordCount += wordCount
          if (thisClass.doTranslation){
            if (wordCount > 0){
              thisClass.translate(text, (err, translatedText) => {
                thisClass.transcript.translation = translatedText
                console.log("ORIGIONAL: " + text)
                console.log("TRANSLATED: " + translatedText)
                if (thisClass.NLUnderstanding){
                  if (wordCount > 4){
                    thisClass.analyze(text, (err, data) => {
                      server.mergingChannels(thisClass.speakerId, thisClass.transcript)
                    })
                  }else{
                    server.mergingChannels(thisClass.speakerId, thisClass.transcript)
                  }
                }else
                  server.mergingChannels(thisClass.speakerId, thisClass.transcript)
              })
            }else
              server.mergingChannels(thisClass.speakerId, thisClass.transcript)
          }else{
            if (thisClass.NLUnderstanding){
              if (wordCount > 4){
                thisClass.analyze(text, (err, data) => {
                  server.mergingChannels(thisClass.speakerId, thisClass.transcript)
                })
              }else{
                server.mergingChannels(thisClass.speakerId, thisClass.transcript)
              }
            }else{
              server.mergingChannels(thisClass.speakerId, thisClass.transcript)
            }
          }
        }else{
          thisClass.transcript.text = thisClass.transcript.text.replace(/%HESITATION/g, "")
          server.mergingChannels(thisClass.speakerId, thisClass.transcript)
        }
      }else{
        //console.log("speaker_labels avail.")
      }
    });
  },
  closeConnection: function(){
    this.ws.close()
  },
  enableTranslation: function(flag){
    console.log("WATSON enableTranslation: " + flag)
    this.doTranslation = flag
  },
  transcribe: function(bufferStream) {
    this.ws.send(bufferStream, {
      binary: true,
      mask: true,
    });
  },
  translate: function(text, callback){
    var translateParams = {
      text: text,
      modelId: 'en-es',
    };

    this.translator.translate(translateParams)
      .then(translationResult => {
        callback(null, translationResult.result.translations[0].translation)
      })
      .catch(err => {
        console.log('error:', err);
        callback(err.message, "")
      });
  },
  analyze: function(text, callback){
    var parameters = {
      'text': text,
      'features': {
        'keywords': {
          'emotion': true,
          'sentiment': true,
          'limit': 3
        }
      }
    }
    //console.log(parameters)
    var thisClass = this

    this.NLUnderstanding.analyze(parameters)
      .then(analysisResults => {
          if (analysisResults.result.keywords.length > 0){
              for (var keyword of analysisResults.result.keywords){
                if (keyword.hasOwnProperty("sentiment")){
                  thisClass.transcript.sentenceSentimentScore = keyword.sentiment.score
                  thisClass.sentimentScore += keyword.sentiment.score
                  var scaled = Math.floor((thisClass.sentimentScore / thisClass.sentimentCount) * 100)
                  if (scaled > 0){
                    thisClass.transcript.analysis.sentimentScore = Math.ceil((scaled / 2) + 50)
                  }else{
                    thisClass.transcript.analysis.sentimentScore = Math.ceil(scaled / 2) * -1
                  }
                  thisClass.sentimentCount++
                }
                if (keyword.hasOwnProperty('emotion')){
                  thisClass.sadnessScore += keyword.emotion.sadness
                  thisClass.joyScore += keyword.emotion.joy
                  thisClass.fearScore += keyword.emotion.fear
                  thisClass.disgustScore += keyword.emotion.disgust
                  thisClass.angerScore += keyword.emotion.anger
                  thisClass.transcript.analysis.sadnessScore = Math.floor((thisClass.sadnessScore / thisClass.emotionCount) * 100)
                  thisClass.transcript.analysis.joyScore = Math.floor((thisClass.joyScore / thisClass.emotionCount) * 100)
                  thisClass.transcript.analysis.fearScore = Math.floor((thisClass.fearScore / thisClass.emotionCount) * 100)
                  thisClass.transcript.analysis.disgustScore = Math.floor((thisClass.disgustScore / thisClass.emotionCount) * 100)
                  thisClass.transcript.analysis.angerScore = Math.floor((thisClass.angerScore / thisClass.emotionCount) * 100)
                  thisClass.emotionCount++
                }
              }
          }
          callback(null, "")
      })
      .catch(err => {
          console.log('error!');
          callback(err.message, "")
      });
  }
}
module.exports = WatsonEngine;
