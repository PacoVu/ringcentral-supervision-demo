var fs = require('fs');
if (process.env.PRODUCTION == false)
  require('dotenv').config()

const PhoneEngine = require('./supervisor-engine');

var supervisorArr = []

const http = require('http');
var url = require('url');
var eventResponse = null

var port = process.env.PORT || 5000

http.createServer((request, response) => {
  console.log(`Request url: ${request.url}`);

  const eventHistory = [];

  request.on('close', () => {
    closeConnection(response);
  });

  if (request.method === "GET") {
    if (request.url.toLowerCase() === '/events') {
      console.log("METHOD EVENT: " + request.method)
      response.writeHead(200, {
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      eventResponse = response
      //checkConnectionToRestore(request, response, eventHistory);
      console.log("LOGIN")
      //supervisor.initializePhoneEngine()
      /*
      let supervisor1 = new PhoneEngine("120")
      supervisor1.initializePhoneEngine()
      var agent1 = {
          name: "595861017",
          engine: supervisor1
      }
      supervisorArr.push(agent1)

      let supervisor2 = new PhoneEngine("116")
      supervisor2.initializePhoneEngine()
      var agent2 = {
        name: "590490017",
        engine: supervisor2
      }
      supervisorArr.push(agent2)
      */
    }else if (request.url.indexOf("/enable_translation") != -1){
      console.log(request.url)
      var queryData = url.parse(request.url, true).query;
      console.log(queryData.enable)
      //supervisor.enableTranslation(queryData.enable)
      for (var supervisor of supervisorArr){
        if (supervisor.name == queryData.agent){
          supervisor.engine.enableTranslation(queryData.enable)
          break
        }
      }
      //supervisorArr[0].engine.enableTranslation(queryData.enable)
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end();
    }else if (request.url.indexOf("/recording") !== -1){
      console.log(request.url)
      var queryData = url.parse(request.url, true).query;
      console.log(queryData.enable)
      //supervisor.enableRecording(queryData.enable)
      //supervisorArr[0].engine.enableRecording(queryData.enable)
      for (var supervisor of supervisorArr){
        if (supervisor.name == queryData.agent){
          supervisor.engine.enableRecording(queryData.enable)
          break
        }
      }
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end();
    }else if (request.url.indexOf("/supervise") !== -1){
      console.log(request.url)
      var queryData = url.parse(request.url, true).query;
      console.log(queryData.agent)
      let supervisor = new PhoneEngine(queryData.agent)
      supervisor.initializePhoneEngine()
      var agent = {
          name: queryData.agent,
          engine: supervisor
      }
      supervisorArr.push(agent)

      response.writeHead(200, { "Content-Type": "text/html" });
      response.end();
    }else{
      console.log(request.url)
      //request.sendFile(path.join(__dirname + '/client/build/index.html'))
      fs.readFile(path.join(__dirname + '/client/build/index.html'), function (error, pgResp) {
            if (error) {
                response.writeHead(404);
                response.write('Contents you are looking are Not Found');
            } else {
                response.writeHead(200, { 'Content-Type': 'text/html' });
                response.write(pgResp);
            }
            response.end();
        });
    }
  }else if (request.method === "POST"){
    console.log("Not in used")
  }else{
    console.log("Last " + request.url)
    console.log("Not GET nor POST method?")
    response.writeHead(404);
    response.end();
  }
}).listen(port, () => {
  console.log('Server running at ' + port);
});

function sendPhoneEvent(phone){
  var res = 'event: phoneEvent\ndata: ' + JSON.stringify(phone) + '\n\n'
  console.log("sendPhoneEvent: " + res)
  if (!eventResponse.finished) {
      eventResponse.write(res);
  }
  //if (phone.status == "connected")
  //  eventHistory = []
}

function sendTranscriptEvents(transcript) {
  var t = JSON.stringify(transcript)
  console.log(t)
  var res = 'event: transcriptUpdate\ndata: ' + t + '\n\n'
  if (!eventResponse.finished) {
      eventResponse.write(res);
  }
  //if (transcript.status)
  //  eventHistory.push(transcript);
}

function closeConnection(response) {
  if (!response.finished) {
    response.end();
    //console.log('Stopped sending events.');
  }
}

function checkConnectionToRestore(request, response, eventHistory) {
  if (request.headers['last-event-id']) {
    const eventId = parseInt(request.headers['last-event-id']);
    eventsToReSend = eventHistory.filter((e) => e.id > eventId);
    eventsToReSend.forEach((e) => {
      if (!response.finished) {
        response.write(e);
      }
    });
  }
}

module.exports.sendTranscriptEvents = sendTranscriptEvents;
module.exports.sendPhoneEvent = sendPhoneEvent;
