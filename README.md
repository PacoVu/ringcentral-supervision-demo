# RingCentral calls supervision demo

## Create a RingCentral app
Login your RingCentral developer account at https://developers.ringcentral.com and create an app with the following requirements:
- App type: "Web Server"
- Authorization: "Only members of my organization/company" (a.k.a password flow)
- Permissions: Call Control - ReadAccounts - WebhookSubscriptions - VoIP Calling

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

- `RINGCENTRAL_JWT`=Call_Supervisor_JWT

- `SUPERVISOR_GROUP_NAME`=Call Monitor GroupName

## Setup a Call Monitoring Group
Login your sandbox account at https://service.devtest.ringcentral.com and create a call monitoring group and name it "Demo Supervisor"

- Choose one user extension as a supervisor. Use this extension's login credentials to authenticate your app.
- Choose 2 user extensions as the monitored agents.

## Run the demo
Open 2 terminal windows and run the following command on each window. Assumed that you are under the main project folder.

Ngrok tunnel
```
% ngrok http 3000
```
Copy the ngrok address and specify it in the .env as follow:

`DELIVERY_MODE_ADDRESS=https://XXXXXXXX.ngrok.io/webhookcallback`

Start server
```
% cd ringcentral-supervision-demo
% node index.js
```

## Test

Make an call to the monitored agent phone number, answer it and start a conversation.

Hang up the call and check the audio recording .raw files.

Play back the audio using this command (on MacOS). Change the rate accordingly if it is not 8000
```
% play -e signed -b 16 -c 1 -r 8000 xxx.raw
```
