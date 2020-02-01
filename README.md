# RingCentral calls supervision demo

## Clone and Setup

```
git clone https://github.com/PacoVu/ringcentral-supervision-demo
cd ringcentral-supervision-demo
$ npm install --save
cp .env.sample .env
```

Edit `.env` to specify credentials.

 - `RINGCENTRAL_USERNAME` is the supervisor username
 - `RINGCENTRAL_AGENT_EXT` is the extension number to be supervised. E.g. "105"
 - `WATSON_SPEECH_TO_TEXT_USERNAME` is your Watson Speech-to-Text service username credential
 - `WATSON_SPEECH_TO_TEXT_PASSWORD` is your Watson Speech-to-Text service password credential
 - `WATSON_LANGUAGE_TRANSLATION_API_KEY`  is your Watson Language Translation service API key
 - `WATSON_NATURAL_LANGUAGE_UNDERSTANDING_API_KEY` is your Watson NLU service API key

## Run the demo
Open 4 terminal windows and run the following command on each window

Ngrok tunnel
```
$ ngrok http 5000
```
Copy the ngrok address and specify it in the .env as follow:

`DELIVERY_MODE_ADDRESS=https://7ba3f616.ngrok.io/webhookcallback`

Start client
```
$ cd client
$ npm start
```

Start server
```
$ node index.js
```

## Test

Make an incoming call to `RINGCENTRAL_AGENT_EXT`, answer it and start a conversation.

Watch the conversation transcription on the client app.

Enable the translation to see conversation translated from English to Chinese.

## Playback a call recording

If you clicked the start/stop recording during the call, you can play the saved audio by:

```
$ play -c 1 -r 16000 -e signed -b 16 audio_file_name.raw
```
