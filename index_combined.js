// SoftPhone
require('dotenv').config()

const PhoneEngine = require('./supervisor-engine');
let supervisor = new PhoneEngine()

const http = require('http');
var url = require('url');
var eventResponse = null

http.createServer((request, response) => {
  console.log(`Request url: ${request.url}`);

  const eventHistory = [];

  request.on('close', () => {
    closeConnection(response);
  });

  if (request.method === "GET") {
    if (request.url.toLowerCase() === '/events') {
      console.log("METHOD: " + request.method)
      response.writeHead(200, {
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      eventResponse = response
      checkConnectionToRestore(request, response, eventHistory);
      console.log("LOGIN")
      supervisor.initializePhoneEngine()

    }else if (request.url.indexOf("/enable_translation") != -1){
      console.log(request.url)
      var queryData = url.parse(request.url, true).query;
      console.log(queryData.enable)
      supervisor.enableTranslation(queryData.enable)
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end();
    }else if (request.url.indexOf("/recording") !== -1){
      console.log(request.url)
      var queryData = url.parse(request.url, true).query;
      console.log(queryData.enable)
      supervisor.enableRecording(queryData.enable)
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end();
    }else{
        console.log("Not GET nor POST method?")
        response.writeHead(404);
        response.end();
    }
  }else if (request.method === "POST"){
      if (request.url === "/webhookcallback") {
        if(request.headers.hasOwnProperty("validation-token")) {
            response.setHeader('Validation-Token', request.headers['validation-token']);
            response.statusCode = 200;
            response.end();
        }else{
          var body = []
          request.on('data', function(chunk) {
              body.push(chunk);
            }).on('end', function() {
              body = Buffer.concat(body).toString();
              var jsonObj = JSON.parse(body)
              for (var party of jsonObj.body.parties){
                console.log("Receive session notification")
                if (party.direction === "Inbound"){
                  if (party.status.code === "Proceeding"){
                    sendPhoneEvent("ringing")
                    //supervisor.processTelephonySessionNotification(jsonObj.body)
                  }else if (party.status.code === "Answered"){
                    supervisor.processTelephonySessionNotification(jsonObj.body)
                  }else if (party.status.code === "Disconnected"){
                    sendPhoneEvent("idle")
                    supervisor.hangup()
                  }else
                    console.log(JSON.stringify(jsonObj.body))
                  return
                }else
                  console.log(JSON.stringify(jsonObj.body))
              }
            });
        }
      }
  }else{
      console.log("Not GET nor POST method?")
      response.writeHead(404);
      response.end();
  }
}).listen(5000, () => {
  console.log('Server running at http://127.0.0.1:5000/');
});

function sendPhoneEvent(status){
  var res = 'event: phoneEvent\ndata: {"status": "' + status + '"}\n\n'
  console.log("sendPhoneEvent: " + res)
  if (!eventResponse.finished) {
      eventResponse.write(res);
  }
  if (status == "connected")
    eventHistory = []
}

function sendEvents(transcript) {
  var res = 'event: transcriptUpdate\ndata: ' + JSON.stringify(transcript) + '\n\n'
  if (!eventResponse.finished) {
      eventResponse.write(res);
  }
  if (transcript.status)
    eventHistory.push(transcript);
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

module.exports.sendEvents = sendEvents;
module.exports.sendPhoneEvent = sendPhoneEvent;
