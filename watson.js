const WS = require('ws')
//var watson = require('watson-developer-cloud');
var request = require('request')
var fs = require('fs')
var server = require('./index')
const LanguageTranslatorV3 = require('ibm-watson/language-translator/v3');
const NaturalLanguageUnderstandingV1 = require("ibm-watson/natural-language-understanding/v1.js")

var english_language_model = 'en-US_NarrowbandModel'
var chinese_language_model = "zh-CN_NarrowbandModel"
var spanish_language_model = "es-ES_NarrowbandModel"
const wsURI = 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?access_token='
var eng_wsURI = 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?access_token=[TOKEN]&model=' + english_language_model;
var chi_wsURI = 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?access_token=[TOKEN]&model=' + chinese_language_model;
var spa_wsURI = 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?access_token=[TOKEN]&model=' + spanish_language_model;

var fiftynineMinute = 59
//var refreshToken = ""
var languages = [
  {language: "english", translator_model: "en-es"},
  {language: "spanish", translator_model: "es-en"}
]
getWatsonToken()
setInterval(function(){
  fiftynineMinute--
  console.log("refresh watson token in " + fiftynineMinute + " mins")
  if (fiftynineMinute <= 1){
    getWatsonToken()
    fiftynineMinute = 59
  }
}, 60000)

function getWatsonToken(){
  request.post("https://iam.cloud.ibm.com/identity/token", {form:
      { grant_type:'urn:ibm:params:oauth:grant-type:apikey',
        apikey: process.env.WATSON_SPEECH_TO_TEXT_API_KEY
      }}, function(error, response, body) {
        var jsonObj = JSON.parse(body)
        eng_wsURI = wsURI + jsonObj.access_token + '&model=' + english_language_model;
        chi_wsURI = wsURI + jsonObj.access_token + '&model=' + chinese_language_model;
        spa_wsURI = wsURI + jsonObj.access_token + '&model=' + spanish_language_model;
        /*
        eng_wsURI = eng_wsURI.replace('[TOKEN]', jsonObj.access_token);
        chi_wsURI = chi_wsURI.replace('[TOKEN]', jsonObj.access_token);
        spa_wsURI = spa_wsURI.replace('[TOKEN]', jsonObj.access_token);
        */
        //console.log(eng_wsURI)
  });
}
//
function WatsonEngine(agentExtNumber, speakerName, speakerId, language) {
  this.doTranslation = false
  this.wss = [null]
  this.speakerId = speakerId
  this.language = language
  this.translate_language_model = 'en-zh'

  this.naturalLanguageUnderstanding = new NaturalLanguageUnderstandingV1({
    version: '2019-07-12',
    iam_apikey: process.env.WATSON_NATURAL_LANGUAGE_UNDERSTANDING_API_KEY,
    url: 'https://gateway.watsonplatform.net/natural-language-understanding/api'
  });

  this.languageTranslator = new LanguageTranslatorV3({
    version: '2018-05-01',
    iam_apikey: process.env.WATSON_LANGUAGE_TRANSLATION_API_KEY,
    url: 'https://gateway.watsonplatform.net/language-translator/api'
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
  this.wordsArr = []
  this.speakersArr = []
  this.speakersText = {}

  this.transcript = {
    agent: agentExtNumber,
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
    console.log("createWatsonSocket")
    this.ws = null
    if (this.language == "chinese"){
      this.translate_language_model = 'zh-en'
      this.ws = new WS(chi_wsURI);
    }else if (this.language == "spanish"){
      this.translate_language_model = 'es-en'
      this.ws = new WS(spa_wsURI);
    }else if (this.language == "english"){
      this.translate_language_model = 'en-es'
      this.ws = new WS(eng_wsURI);
    }
    var message = {
      'action': 'start',
      'content-type': 'audio/l16;rate='+ sampleRate +';channels=1',
      'timestamps': false,
      'interim_results': true,
      'inactivity_timeout': -1,
      'smart_formatting': true,
      'speaker_labels': false
    };
    var thisClass = this
    this.ws.onopen = function(evt) {
      console.log("Watson Socket open")
      thisClass.ws.send(JSON.stringify(message));
      callback(null, "READY")
    };

    this.ws.onclose = function(data) {
      console.log("Watson Socket closed. Need to notify supervisor engine")
      //console.log(data)
    };

    this.ws.on('connection', function(evt) {
      console.log("Watson Socket connect")
      //console.log(evt);
    });
    this.ws.onerror = function(evt) {
      console.log("Watson Socket error")
      console.log(evt);
      callback(evt, "")
    };

    this.ws.on('message', function(evt) {
      var res = JSON.parse(evt)
      if (res.hasOwnProperty('results')){
        //if (evt.results.length > 0){
        //console.log(evt)
        thisClass.transcript.index = res.result_index
        thisClass.transcript.timestamp = "xx:xx"
        thisClass.transcript.final = res.results[0].final
        thisClass.transcript.text = res.results[0].alternatives[0].transcript
        //thisClass.transcript.translation = ""
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
                if (wordCount > 4){
                  var analyzingText = text
                  if (thisClass.language != "english")
                    analyzingText = translatedText
                  thisClass.analyze(analyzingText, (err, data) => {
                    server.mergingChannels(thisClass.speakerId, thisClass.transcript)
                  })
                }else{
                  server.mergingChannels(thisClass.speakerId, thisClass.transcript)
                }
              })
            }else
              server.mergingChannels(thisClass.speakerId, thisClass.transcript)
          }else{
            if (thisClass.language == "english" && wordCount > 4){
              thisClass.analyze(text, (err, data) => {
                server.mergingChannels(thisClass.speakerId, thisClass.transcript)
              })
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
    //console.log("called")
  },
  translate: function(text, callback){
    if (this.translate_language_model == "")
      return
    var translateParams = {
      text: text.trim(),
      model_id: this.translate_language_model,
    };

    this.languageTranslator.translate(translateParams)
      .then(translationResult => {
        callback(null, translationResult.translations[0].translation)
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
        //'concepts': {},
        //'categories': {},
        //'entities': {
        //  'emotion': true,
        //  'sentiment': true
        //},
      }
    }
    //console.log("Analyze: " + text)
    var thisClass = this
    this.naturalLanguageUnderstanding.analyze(parameters)
      .then(analysisResults => {
          //console.log("Analyse: " + JSON.stringify(analysisResults, null, 2));
          if (analysisResults.keywords.length > 0){
            for (var keyword of analysisResults.keywords){
              //console.log("Analyse: " + JSON.stringify(keyword))
              if (keyword.hasOwnProperty("sentiment")){
                thisClass.transcript.sentenceSentimentScore = keyword.sentiment.score
                thisClass.sentimentScore += keyword.sentiment.score
                thisClass.transcript.analysis.sentimentScore = Math.floor((thisClass.sentimentScore / thisClass.sentimentCount) * 100)
                /*
                var scaled = Math.floor((thisClass.sentimentScore / thisClass.sentimentCount) * 100)
                if (scaled > 0){
                  thisClass.transcript.analysis.sentimentScore = Math.ceil((scaled / 2) + 50)
                }else{
                  thisClass.transcript.analysis.sentimentScore = Math.ceil(scaled / 2) * -1
                }
                */
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
          console.log('error:', err);
          callback(err.message, "")
      });
  }
}

module.exports = WatsonEngine;
