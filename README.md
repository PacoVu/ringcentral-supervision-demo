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

Edit `.env` and set the values.

- `RINGCENTRAL_SERVER_URL`=https://platform.devtest.ringcentral.com
- `RINGCENTRAL_CLIENT_ID`=Your App Client Id
- `RINGCENTRAL_CLIENT_SECRET`=Your App Client Secret

- `RINGCENTRAL_JWT`=Call_Supervisor_JWT

- `SUPERVISOR_GROUP_NAME`=Demo Supervisor

- `SIP_INFO_USERNAME`=Sip-Device-Username
- `SIP_INFO_PASSWORD`=Sip-Device-Pwd
- `SIP_INFO_AUTHORIZATION_ID`=Sip-Auth-Id


- `DELIVERY_MODE_ADDRESS`=[Your_WebHook_Address]/webhookcallback

- `WATSON_SPEECH2TEXT_API_KEY`=Your_Watson_Speech_To_Text_Api_Key
- `WATSON_LANGUAGE_TRANSLATION_API_KEY`=Your Watson Language Translation service API key
- `WATSON_NLU_API_KEY`=Your Watson NLU service API key

- `STT_INSTANCE_ID`=Your_SpeechToText_Instance_Id
- `NLU_INSTANCE_ID`=Your_NLU_Instance_Id
- `LT_INSTANCE_ID`=Your_LanguageTranslator_Instance_Id


## Setup a Call Monitoring Group
Login your account at https://service.ringcentral.com and create a call monitoring group and name it "Demo Supervisor"

- Choose one user extension as a supervisor. Use this extension's login credentials to authenticate your app.
- Choose 2 user extensions as the monitored agents.

## Setup a supervisor's device
Login your account at https://service.ringcentral.com and select the supervisor user extension.

- Select the *Devices & Numbers* option.
- Click the *+ Add Phone* button.
- At the popup dialog select the "Domestic" for the location and click Next.
- At the select devices step, select the *Other Phones* option.
- Select the *Existing Phone* item and add the selected device.
- Continue to select a phone number for the device and follow the prompts on the screen to complete the device setup.
- Click on the newly added phone device to open the device page.
- On the device page, click the *Set Up and Provision* button.
- On the popup dialog, click the `Set up manually using SIP` link.
- Copy the values of following fields and paste them in the .env keys accordingly.
    * User name => SIP_INFO_USERNAME
    * Password => SIP_INFO_PASSWORD
    * Authorization Id => SIP_INFO_AUTHORIZATION_ID


## Run the demo
Open 3 terminal windows and run the following command on each window. Assumed that you are under the main project folder.

Ngrok tunnel
```
$ cd ringcentral-supervision-demo
$ ngrok http 3004
```
Copy the ngrok address and specify it in the .env as follow:

`DELIVERY_MODE_ADDRESS=https://XXXXXXXX.ngrok.io/webhookcallback`

Install Dependencies and Start the server
```
$ cd ringcentral-supervision-demo
$ npm install --save
$ node index.js
```

Install Dependencies and Start the client
```
$ cd ringcentral-supervision-demo
$ cd client
$ npm install --save
$ npm start
```

## Test

Make an call to the monitored agent phone number, answer it and start a conversation.

Watch the conversation transcription on the client app.

Enable the translation to see conversation translated from English to Spanish.

If you do not have the IBM Watson NLU and Language Translator services setup, you can skip them by comment out the objects creation in the Watson engine class constructor!
