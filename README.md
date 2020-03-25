# RingCentral calls supervision demo

## Create a RingCentral app
Login your RingCentral developer account at https://developers.ringcentral.com and create an app with the following requirements:
- App type: "Web Server"
- Authorization: "Only members of my organization/company" (a.k.a password flow)
- Permissions: Call Control - ReadAccounts - WebhookSubscriptions

## Clone the project and Setup

```
git clone https://github.com/PacoVu/ringcentral-supervision-demo
cd ringcentral-supervision-demo
$ npm install --save
cp .env.sample .env
```

Edit `.env` to specify credentials.

- `RINGCENTRAL_SERVER_URL`=https://platform.devtest.ringcentral.com
- `RINGCENTRAL_CLIENT_ID`=Your App Client Id
- `RINGCENTRAL_CLIENT_SECRET`=Your App Client Secret

- `RINGCENTRAL_USERNAME`=Your_Supervisor_Username
- `RINGCENTRAL_EXTENSION`=Your_Supervisor_Extension_Number
- `RINGCENTRAL_PASSWORD`=Your_Supervisor_Password

- `AGENT_EXTENSION_NUMBER`=Your_Agent_Extension_Number
- `SUPERVISOR_GROUP_NAME`=Demo Supervisor

 - `WATSON_SPEECH2TEXT_API_KEY`=Your_Watson_Speech_To_Text_Api_Key
 - `WATSON_LANGUAGE_TRANSLATION_API_KEY`=Your Watson Language Translation service API key
 - `WATSON_NLU_API_KEY`=Your Watson NLU service API key

 - `PGHOST`=Your local Postgres host (e.g. localhost)
 - `PGUSER`=Your Postgres user name
 - `PGDATABASE`=Your Postgres database name
 - `PGPASSWORD`=Your Postgres password
 - `PGPORT`=Your Postgres port (e.g. 5432)

## Setup a Call Monitoring Group
Login your sandbox account at https://service.devtest.ringcentral.com and create a call monitoring group and name it "Demo Supervisor"

- Choose one user extension as a supervisor. Use this extension's login credentials to authenticate your app.
- Choose 2 user extensions as the monitored agents.

## Run the demo
Open 3 terminal windows and run the following command on each window. Assumed that you are under the main project folder.

Ngrok tunnel
```
$ cd ringcentral-supervision-demo
$ ngrok http 5000
```
Copy the ngrok address and specify it in the .env as follow:

`DELIVERY_MODE_ADDRESS=https://XXXXXXXX.ngrok.io/webhookcallback`

Start server
```
$ cd ringcentral-supervision-demo
$ node index.js
```

Start client
```
$ cd ringcentral-supervision-demo
$ cd client
$ npm start
```

## Test

Make an call to the monitored agent phone number, answer it and start a conversation.

Watch the conversation transcription on the client app.

Enable the translation to see conversation translated from English to Spanish.
