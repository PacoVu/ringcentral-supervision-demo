require('dotenv').config()
const RingCentral = require('@ringcentral/sdk').SDK

const rc = new RingCentral({
  server: process.env.RINGCENTRAL_SERVER_URL,
  clientId: process.env.RINGCENTRAL_CLIENT_ID,
  clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
})


function removeAllRegisteredSubscriptions() {
  rc.login({
    username: process.env.RINGCENTRAL_USERNAME,
    extension: process.env.RINGCENTRAL_EXTENSION,
    password: process.env.RINGCENTRAL_PASSWORD
  })
  .then(function(res){
    rc.get('/restapi/v1.0/subscription/')
      .then(function (response) {
        var jsonObj = response.json()
        console.log(JSON.stringify(jsonObj))
        for (var record of jsonObj.records){
          console.log("record " + JSON.stringify(record))
          console.log("====")
        }

        for (var record of jsonObj.records) {
            rc.delete('/subscription/' + record.id)
              .then(function (resp){
                console.log('delete ' + record.id)
              })
        }
      })
      .catch(function(e) {
        console.error(e.toString());
      });
  })
}

removeAllRegisteredSubscriptions()
