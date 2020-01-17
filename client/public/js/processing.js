var canPoll = false
var voiceMailList = []
var assend = false
var sortedByUrgency = false

function reportSpam(number){
  //alert(number)
  var url = "markspam?number=" + number
  var getting = $.get( url );
  getting.done(function( res ) {
    if (res.status == "ok"){
      alert("done")
    }
  });
}

function open_modal(name) {
    var message = $('#send_sms_form');
    BootstrapDialog.show({
        title: 'Send SMS message',
        message: $('#send_sms_form'),
        draggable: true,
        onhide : function(dialog) {
          $('#hidden-div').append(message);
        },
        buttons: [{
          label: 'Close',
          action: function(dialog) {
            dialog.close();
          }
        }, {
          label: 'Send message',
          cssClass: 'btn btn-primary',
          action: function(dialog) {
            if (sendSMS())
              dialog.close();
          }
        }]
    });
}

function sendSMS(){
    var text = $("#message").val()
    if (text == ""){
        $("#message").focus()
        return false
    }
    var url = "sendsms"
    var params = {
        from : $("#from").val(),
        to: $("#to").val(),
        text: text
        }
    var posting = $.post( url, params );
    posting.done(function( resp ) {
        if (resp.status == "ok") {

        }
    });
    posting.fail(function(response){
        alert(response.statusText);
    });
    return true
}
