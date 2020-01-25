const WS = require('ws')
//var watson = require('watson-developer-cloud');
var request = require('request')
var fs = require('fs')
var server = require('./index')
const LanguageTranslatorV3 = require('ibm-watson/language-translator/v3');
const NaturalLanguageUnderstandingV1 = require("ibm-watson/natural-language-understanding/v1.js")

var language_model = 'en-US_NarrowbandModel'

var wsURI = 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?access_token=[TOKEN]&model=en-US_NarrowbandModel';
request.post("https://iam.cloud.ibm.com/identity/token", {form:
    { grant_type:'urn:ibm:params:oauth:grant-type:apikey',
      apikey: process.env.WATSON_SPEECH_TO_TEXT_API_KEY
    }}, function(error, response, body) {
      var jsonObj = JSON.parse(body)
      //console.log(jsonObj.access_token)
      wsURI = wsURI.replace('[TOKEN]', jsonObj.access_token);
      //console.log(thisClass.wsURI)
});

//
function WatsonEngine(agentName) {
  this.doTranslation = false
  this.wss = [null]
  this.agentName = agentName

  var thisClass = this
  /*
  this.wsURI = 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?access_token=[TOKEN]&model=en-US_NarrowbandModel';
  request.post("https://iam.cloud.ibm.com/identity/token", {form:
      { grant_type:'urn:ibm:params:oauth:grant-type:apikey',
        apikey: process.env.WATSON_SPEECH_TO_TEXT_API_KEY
      }}, function(error, response, body) {
        var jsonObj = JSON.parse(body)
        //console.log(jsonObj.access_token)
        thisClass.wsURI = thisClass.wsURI.replace('[TOKEN]', jsonObj.access_token);
        //console.log(thisClass.wsURI)
  });
  */
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
    agent: this.agentName,
    index: 0,
    speaker: "Identifying speaker",
    timestamp: "xx.xx",
    status: false,
    text: "",
    translation: "",
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
    this.ws = new WS(wsURI);
    var message = {
      'action': 'start',
      'content-type': 'audio/l16;rate='+ sampleRate +';channels=1',
      'timestamps': false,
      'interim_results': true,
      'inactivity_timeout': -1,
      'smart_formatting': true,
      'speaker_labels': true
    };
    var thisClass = this
    /*
    ['message', 'error', 'close', 'open', 'connection'].forEach(function(eventName) {
      ws.on(eventName, console.log.bind(console, eventName + ' event: '));
    });
    */
    /*
    thisClass.ws.on('open', function(evt) {
      console.log("Watson Socket open")
      thisClass.ws.send(JSON.stringify(message));
      callback(null, "READY")
    });
    */
    this.ws.onopen = function(evt) {
      console.log("Watson Socket open")
      thisClass.ws.send(JSON.stringify(message));
      callback(null, "READY")
    };
    /*
    thisClass.ws.on('close', function(data) {
      console.log("Watson Socket closed")
      console.log(data)
    });
    */

    this.ws.onclose = function(data) {
      console.log("Watson Socket closed")
      //console.log(data)
    };

    thisClass.ws.on('connection', function(evt) {
      console.log("Watson Socket connect")
      //console.log(evt);
    });
    /*
    thisClass.ws.on('error', function(evt) {
      console.log("Watson Socket error")
      console.log(evt);
      callback(evt, "")
    });
    */
    this.ws.onerror = function(evt) {
      console.log("Watson Socket error")
      console.log(evt);
      callback(evt, "")
    };

    thisClass.ws.on('message', function(evt) {
      var res = JSON.parse(evt)
      if (res.hasOwnProperty('results')){
        //if (evt.results.length > 0){
        //console.log(evt)
        thisClass.transcript.index = res.result_index
        thisClass.transcript.speaker = "1"
        thisClass.transcript.timestamp = "xx.xx"
        thisClass.transcript.status = res.results[0].final
        thisClass.transcript.text = res.results[0].alternatives[0].transcript
        thisClass.transcript.translation = ""

        if (res.results[0].final){
          /*
          console.log("Words")
          console.log(evt)
          for (var word of res.results[0].alternatives[0].timestamps){
            var item = {
              word: word[0].trim(),
              time: word[1]
            }
            thisClass.wordsArr.push(item)
          }
          */
          var text = res.results[0].alternatives[0].transcript
          text = text.trim()
          var wordCount = text.split(" ").length
          if (thisClass.doTranslation){
            if (wordCount > 0){
              thisClass.translate(text, (err, translatedText) => {
                thisClass.transcript.translation = translatedText
                if (wordCount > 4){
                  thisClass.analyze(text, (err, data) => {
                    server.sendTranscriptEvents(thisClass.transcript)
                  })
                }else{
                  server.sendTranscriptEvents(thisClass.transcript)
                }
              })
            }else
              server.sendTranscriptEvents(thisClass.transcript)
          }else{
            if (wordCount > 4){
              thisClass.analyze(text, (err, data) => {
                server.sendTranscriptEvents(thisClass.transcript)
              })
            }else{
              server.sendTranscriptEvents(thisClass.transcript)
            }
          }
        }else{
          server.sendTranscriptEvents(thisClass.transcript)
        }
      }else{
        console.log("speaker_labels avail.")
/*
        console.log("Speakers")
        console.log(evt)
        if (res.hasOwnProperty('speaker_labels')){
          for (var speaker of res.speaker_labels){
            var item = {
              time: speaker.from,
              speaker: speaker.speaker,
              final: speaker.final
            }
            //if (speakersText[speaker.speaker.toString()] !== undefined)
            thisClass.speakersText[speaker.speaker.toString()] = ""
            console.log(thisClass.speakersText[speaker.speaker.toString()] + " expected")
            thisClass.speakersArr.push(item)
          }
          console.log("CHECK LEN: " + thisClass.wordsArr.length + " == " + thisClass.speakersArr.length)
          console.log("Words: " + JSON.stringify(thisClass.wordsArr))
          console.log("Speakers: " + JSON.stringify(thisClass.speakersArr))
          ////
          if (thisClass.wordsArr.length == thisClass.speakersArr.length){
            console.log("BEFORE: " + JSON.stringify(thisClass.speakersText))
            for (var i=0; i<thisClass.wordsArr.length; i++){
              var word = thisClass.wordsArr[i].word
              var speakerId = thisClass.speakersArr[i].speaker
              if (word != '%HESITATION'){
                console.log(word)
                thisClass.speakersText[speakerId.toString()] += word + " "
              }
            }

            console.log("AFTER: " + JSON.stringify(thisClass.speakersText))
            // reset
            //thisClass.speakersArr = []
            //thisClass.wordsArr = []
          }else{
            console.log("waiting for more words")
          }
          ////
        }
*/
      }
        //
    });
  },
  closeConnection: function(){
    this.ws.close()
  },
  enableTranslation: function(flag){
    console.log("enableTranslation: " + flag)
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
      text: text.trim(),
      model_id: 'en-zh',
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
    console.log("Analyze: " + text)
    var thisClass = this
    this.naturalLanguageUnderstanding.analyze(parameters)
      .then(analysisResults => {
          //console.log("Analyse: " + JSON.stringify(analysisResults, null, 2));
          // calculate scores
          /*
          var analysis = {
              sentimentScore: 0,
              sadnessScore: 0,
              joyScore: 0,
              fearScore: 0,
              disgustScore: 0,
              angerScore: 0
            }
          */
          if (analysisResults.keywords.length > 0){
            for (var keyword of analysisResults.keywords){
              console.log("Analyse: " + JSON.stringify(keyword))
              if (keyword.hasOwnProperty("sentiment")){
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
          console.log('error:', err);
          callback(err.message, "")
      });
  }
}

module.exports = WatsonEngine;
