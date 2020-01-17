var canPoll = false
var voiceMailList = []
var assend = false
var sortedByUrgency = false
var categoryList = []
var agentList = []

function init(){
  var height = $("#menu_header").height()
    //height += $("#search_bar").height()
    //height += $("#voicemail_list_header").height()
    height += $("#footer").height()

    var h = $(window).height() - (height + 90);
    $("#voicemail_list").height(h)

    window.onresize = function() {
      var height = $("#menu_header").height()
      //height += $("#search_bar").height()
      //height += $("#voicemail_list_header").height()
      height += $("#footer").height()

      var h = $(window).height() - (height + 90);
      $("#voicemail_list").height(h)
    }
    readVoiceMail()
    pollResult()
}
function pollResult(){
  var url = "poll"
  var getting = $.get( url );
  canPoll = true
  getting.done(function( res ) {
    if (res.status == "ok") {
      if (res.voicemail.length){
        for (var item of res.voicemail){
          voiceMailList.push(item)
        }
        updateVoicemailList()
      }else{
        updateVoicemailAge()
      }
      window.setTimeout(function(){
        if (canPoll)
          pollResult()
      }, 5000)
    }else{

    }
  });
}

function readVoiceMail(){
  var url = "read"
  var getting = $.get( url );
  getting.done(function( res ) {
    if (res.status == "ok"){
      voiceMailList = []
      if (res.voicemail.length){
        for (var item of res.voicemail){
          voiceMailList.push(item)
        }
        sortedContentList()
      }
      listItems()
    }
  });
}
function updateVoicemailList(){
  if (sortedByUrgency){
    if (assend){
      voiceMailList.sort(sortUrgencyAssend)
    }else{
      voiceMailList.sort(sortUrgencyDessend)
    }
  }else{
    if (assend){
      voiceMailList.sort(sortDateAssend)
    }else{
      voiceMailList.sort(sortDateDessend)
    }
  }
  listItems()
}

function logout(){
  window.location.href = "index?n=1"
}

function addRow(item){
  var row = $("<tr>", {
    id: item.id,
    class: "tr-active"
  })
  var td = $("<td>", {
    });

  var cell = $("<input>", {
    id: "sel_" + item.id,
    name: item.id,
    type: "checkbox",
    onclick: "selectForDelete(name)"
    });
  td.append(cell)
  row.append(td)

  // duration
  td = $("<td>", {
    });
  cell = $("<span>", {
    text: item.duration,
    });
  td.append(cell)
  row.append(td)

  // from
  td = $("<td>")
  if (item.fromNumber != "Unknown") {
      var href =  "rcmobile://call?number=" + item.fromNumber
      if (item.fromName != "Unknown")
          linkText = item.fromName
      else{
        var formattedNumber = formatPhoneNumber(item.fromNumber)
        if (formattedNumber != null)
          linkText = formattedNumber
        else
          linkText = item.fromNumber
      }
      var a = linkText + " <a href='"+ href + "'><img src='./img/call.png'></a>"
      cell = $("<div>")
      cell.html(a)
  }else{
      cell = $("<span>", {
        text: item.fromNumber,
        });
  }
  td.append(cell)
  row.append(td)

  // Source
  var source = "Unknown"
  if (item.spam.hasOwnProperty('reputation_details'))
    if (item.spam.reputation_details.category != undefined)
      source = item.spam.reputation_details.category

  td = $("<td>", {
    class: "td-active"
    });

  if (source == "Unknown"){
    var text = "<span>" + source + "</span> <img height='10px' src='./img/edit.png'></img>"
    cell = $("<div>")
    cell.html(text)
    td.append(cell)
    td.click( function() {
        changeSource(item, source)
    });
  }else{
    td.click( function() {
       window.location.href = createOpenItemLink(item)
    });
    cell = $("<span>", {
      text: source,
    });
  }

  td.append(cell)
  row.append(td)

  // spam
  td = $("<td>", {
    class: "td-active"
    });
  td.click( function() {
      window.location.href = createOpenItemLink(item)
  });
  var spam = "N/A"
  var color = "color: green"
  if (item.spam.hasOwnProperty('reputation_level')){
    if (item.spam.reputation_level == 1)
      spam = "Clean"
    else if (item.spam.reputation_level == 2){
      spam = "Likely"
      color = "color: orange"
    }else if (item.spam.reputation_level == 3){
      spam = "Highly"
      color = "color: brown"
    }else if (item.spam.reputation_level == 4){
      spam = "Risky"
      color = "color: red"
    }
  }
  cell = $("<span>", {
    text: spam,
    style: color,
    });
  td.append(cell)
  row.append(td)

  // urgency
  td = $("<td>", {
    class: "td-active",
    align: "center"
    });
  td.click( function() {
      window.location.href = createOpenItemLink(item)
  });
  cell = $("<span>", {
    text: item.confidence,
  });

  td.append(cell)
  row.append(td)

  // date
  td = $("<td>", {
    class: "td-active",
    align: "center"
  });
  td.click( function() {
      window.location.href = createOpenItemLink(item)
  });

  let options = {  month: 'short',day: 'numeric',year: 'numeric',hour: '2-digit',minute: '2-digit'}
  var dateTime = new Date(parseFloat(item.date)).toLocaleDateString("en-US", options)
  cell = $("<span>", {
    text: dateTime,
    });
  td.append(cell)
  row.append(td)

  // Age
  var now = Date.now();
  var gap = formatVoicemailAge((now - item.date)/1000)
  td = $("<td>", {
    id: "age_" + item.id,
    class: "td-active",
    align: "left"
    });

  cell = $("<span>", {
    text: gap,
  });

  td.append(cell)
  row.append(td)

  // listen
  td = $("<td>", {
    class: "td-active"
    });

  cell = $("<input>", {
      type: "image",
      src: "./img/listen.png",
      onclick: "getAudioLink('"+ item['contentUri']+ "')"
  });

  td.append(cell)
  row.append(td)

  // transcript
  td = $("<td>", {
    class: "td-active"
    });
  cell = $("<span>", {
    text: item.transcript,
    });
  td.append(cell)
  td.click( function() {
      window.location.href = createOpenItemLink(item)
  });
  row.append(td)

  // tag
  td = $("<td>", {
    class: "td-active"
    });
  var text = "<span>" + item.categories + "</span> <img height='10px' src='./img/edit.png'></img>"
  cell = $("<div>")
  cell.html(text)
  td.append(cell)

  td.click( function() {
      changeCategory(item)
  });

  row.append(td)

  // assigned
  td = $("<td>", {
    class: "td-active"
    });
  var text = "<span>" + item.assigned + "</span> <img height='10px' src='./img/edit.png'></img>"
  cell = $("<div>")
  cell.html(text)
  td.append(cell)
  td.click( function() {
      changeAgent(item)
  });
  row.append(td)

  // Responded
  var td = $("<td>", {
    align: "center"
  });

  var cell = $("<input>", {
    id: item['id'],
    type: "checkbox",
    disabled: item.processed,
    checked: item.processed,
    onclick: "selectForSetProcessed(id)"
    });
  td.append(cell)
  row.append(td)
  // implement onclick
  /*
  row.click( function() {
      window.location.href = "openitem?id=" + item['id']
  });
  */
  $("#voicemail_items").append(row)
}

function formatVoicemailAge(dur){
  if (dur > 86400) {
    var d = Math.floor(dur / 86400)
    dur = dur % 86400
    var h = Math.floor(dur / 3600)
    dur = dur % 3600
    var m = Math.floor(dur / 60)
    m = (m>9) ? m : ("0" + m)
    //dur = dur % 60
    //var s = (dur>9) ? dur : ("0" + dur)
    return d + "d" + h + "h" + m + "m" //+ Math.floor(s)
  }else if (dur >= 3600){
    var h = Math.floor(dur / 3600)
    dur = dur % 3600
    var m = Math.floor(dur / 60)
    m = (m>9) ? m : ("0" + m)
    //dur = dur % 60
    //var s = (dur>9) ? dur : ("0" + dur)
    return h + "h" + m + "m"//+ ":" + Math.floor(s)
  }else if (dur >= 60){
    var m = Math.floor(dur / 60)
    //dur %= 60
    //var s = (dur>9) ? dur : ("0" + dur)
    return m + "m" //+ Math.floor(s)
  }else{
    var s = (dur>9) ? dur : ("0" + dur)
    return Math.floor(s) + "s"
  }
}

function updateVoicemailAge(){
  for (var item of voiceMailList){
    //
    var now = Date.now();
    var gap = formatVoicemailAge((now - item.date)/1000)
    var td = $("#age_" + item.id)
    var cell = $("<span>", {
      text: gap,
    });
    td.html(cell)
    //alert(gap)
  }
}

function changeCategory(item){
  var message = $('#change_category_form');
  $("#old_category").html(item.categories)
  BootstrapDialog.show({
      title: 'Change category',
      message: $('#change_category_form'),
      onhide : function(dialog) {
        $('#hidden-div-category').append(message);
      },
      buttons: [{
        label: 'Close',
        action: function(dialog) {
          dialog.close();
        }
      }, {
        label: 'Submit Change',
        cssClass: 'btn btn-primary',
        action: function(dialog) {
          var newCat = $("#new_category").val()
          if (newCat == ""){
            $("#new_category").focus()
            return
          }
          if (submitChangeCategory(item, newCat))
            dialog.close();
        }
      }]
  });
}

function submitChangeCategory(item, newCat){
  var url = "updatecategory"
  var params = {
    id: item.id,
    category: newCat
  }
  var posting = $.post( url, params );
  posting.done(function( res ) {
    if (res.status == "ok"){
      for (var i=0; i<voiceMailList.length; i++){
        if (voiceMailList[i].id == item.id){
          voiceMailList[i].categories = newCat
          listItems()
          break
        }
      }
    }else
      alert(res.message)
  });
  return true
}

function changeSource(item, source){
  var message = $('#change_source_form');
  $("#old_source").html(source)
  BootstrapDialog.show({
      title: 'Change source',
      message: $('#change_source_form'),
      onhide : function(dialog) {
        $('#hidden-div-change-source').append(message);
      },
      buttons: [{
        label: 'Close',
        action: function(dialog) {
          dialog.close();
        }
      }, {
        label: 'Submit Change',
        cssClass: 'btn btn-primary',
        action: function(dialog) {
          var newSource = $("#new_type").val()
          if (newSource == ""){
            $("#new_type").focus()
            return
          }
          if (submitChangeSource(item, newSource))
            dialog.close();
        }
      }]
  });
}

function changeAgent(item){
  var message = $('#change_agent_form');
  $("#old_agent").html(item.assigned)
  BootstrapDialog.show({
      title: 'Change agent',
      message: $('#change_agent_form'),
      onhide : function(dialog) {
        $('#hidden-div-assign-agent').append(message);
      },
      buttons: [{
        label: 'Close',
        action: function(dialog) {
          dialog.close();
        }
      }, {
        label: 'Submit Change',
        cssClass: 'btn btn-primary',
        action: function(dialog) {
          var newAgent = $("#new_agent").val()
          if (newAgent == ""){
            $("#new_agent").focus()
            return
          }
          if (submitChangeAgent(item, newAgent))
            dialog.close();
        }
      }]
  });
}

function submitChangeSource(item, newSource){
  var url = "updatephonesource"
  var params = {
    id: item.id,
    phone_number: item.fromNumber,
    source: newSource
  }
  if (newSource == "customer"){
    params['firstName'] = $("#first_name").val()
    params['lastName'] = $("#last_name").val()
  }
  var posting = $.post( url, params );
  posting.done(function( res ) {
    if (res.status == "ok"){
      for (var i=0; i<voiceMailList.length; i++){
        if (voiceMailList[i].id == item.id){
          if (newSource == "customer"){
            voiceMailList[i].fromName = $("#first_name").val() + " " + $("#last_name").val()
            voiceMailList[i].spam.reputation_details['category'] = "Customer"
          }
          listItems()
          break
        }
      }
    }else
      alert(res.message)
  });
  return true
}

function toggleCustomerInfoForm(){
  if ($("#new_type").val() == "customer")
    $("#customer_info").show()
  else
    $("#customer_info").hide()
}

function submitChangeAgent(item, newAgent){
  var url = "updateagent"
  var params = {
    id: item.id,
    agent: newAgent
  }
  var posting = $.post( url, params );
  posting.done(function( res ) {
    if (res.status == "ok"){
      for (var i=0; i<voiceMailList.length; i++){
        if (voiceMailList[i].id == item.id){
          voiceMailList[i].assigned = newAgent
          listItems()
          break
        }
      }
    }else
      alert(res.message)
  });
  return true
}

function createOpenItemLink(item){
  return "openitem?id=" + item['id'] + "&phoneNumber=" + item['fromNumber']
}

function formatPhoneNumber(phoneNumberString) {
  var cleaned = ('' + phoneNumberString).replace(/\D/g, '')
  var match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    var intlCode = (match[1] ? '+1 ' : '')
    return [intlCode, '(', match[2], ') ', match[3], '-', match[4]].join('')
  }
  return phoneNumberString
}

function getAudioLink(contentUri){
  var url = "getcontent?uri=" + contentUri
  var getting = $.get( url );
  getting.done(function( res ) {
    if (res.status == "ok"){
      $('#voicemail_player').attr('src', res.uri)
    }else
      alert(res.message)
  });
}
var spamLevel = 1
function filteredBySpam(index){
  spamLevel = index
  listItems()
}
var selectedCategory = "all"
function filteredByCategory(cat){
  selectedCategory = cat
  listItems()
}
var selectedAgent = "all"
function filteredByAgent(agent){
  selectedAgent = agent
  listItems()
}
var selectedRespond = "all"
function filteredByRespond(value){
  selectedRespond = value
  listItems()
}
function listItems(){
  var processed = selectedRespond //$("#processed_option").val()
  var agent = selectedAgent //$("#agent_option").val()
  var category = selectedCategory //$("#category_option").val()
  $("#voicemail_items").empty()
  var level = spamLevel //parseInt($("#reputation_level").val())
  if (level == 0){
    for (var item of voiceMailList){
      if (category == "all"){
        if (agent == "all"){
          if (processed == "all")
            addRow(item)
          else if (processed == "processed"){
            if (item.processed)
              addRow(item)
          }else if (processed == "unprocessed"){
            if (!item.processed)
              addRow(item)
          }
        }else{
          if (processed == "all" && agent == item.assigned)
            addRow(item)
          else if (processed == "processed"){
            if (item.processed && agent == item.assigned)
              addRow(item)
          }else if (processed == "unprocessed"){
            if (!item.processed && agent == item.assigned)
              addRow(item)
          }
        }
      }else{
        if (category == item.categories){
          if (agent == "all"){
            if (processed == "all")
              addRow(item)
            else if (processed == "processed"){
              if (item.processed)
                addRow(item)
            }else if (processed == "unprocessed"){
              if (!item.processed)
                addRow(item)
            }
          }else{
            if (processed == "all" && agent == item.assigned)
              addRow(item)
            else if (processed == "processed"){
              if (item.processed && agent == item.assigned)
                addRow(item)
            }else if (processed == "unprocessed"){
              if (!item.processed && agent == item.assigned)
                addRow(item)
            }
          }
        }
      }
    }
  }else {
    for (var item of voiceMailList){
      if (category == "all"){
        if (agent == "all"){
          if (item.spam.reputation_level == level){
            if (processed == "all")
              addRow(item)
            else if (processed == "processed"){
              if (item.processed)
                addRow(item)
            }else if (processed == "unprocessed"){
              if (!item.processed)
                addRow(item)
            }
          }
        }else{
          if (item.spam.reputation_level == level){
            if (processed == "all" && agent == item.assigned)
              addRow(item)
            else if (processed == "processed"){
              if (item.processed && agent == item.assigned)
                addRow(item)
            }else if (processed == "unprocessed"){
              if (!item.processed && agent == item.assigned)
                addRow(item)
            }
          }
        }
      }else{
        if (category == item.categories){
          if (agent == "all"){
            if (item.spam.reputation_level == level){
              if (processed == "all")
                addRow(item)
              else if (processed == "processed"){
                if (item.processed)
                  addRow(item)
              }else if (processed == "unprocessed"){
                if (!item.processed)
                  addRow(item)
              }
            }
          }else{
            if (item.spam.reputation_level == level){
              if (processed == "all" && agent == item.assigned)
                addRow(item)
              else if (processed == "processed"){
                if (item.processed && agent == item.assigned)
                  addRow(item)
              }else if (processed == "unprocessed"){
                if (!item.processed && agent == item.assigned)
                  addRow(item)
              }
            }
          }
        }
      }
    }
  }
}

function searchCaseNumber(){
  var caseId = $("#search").val()
  if (caseId == ""){
    $("#search").focus()
    return
  }
  $("#voicemail_items").empty()
  for (var item of voiceMailList){
    if (item['id'] == caseId){
      addRow(item)
      break
    }
  }
}

function selectForSetProcessed(id){
  var url = "setprocessed?id=" + id
  var getting = $.get( url );
  getting.done(function( res ) {
    if (res.status == "ok"){
      $('#' + id).attr('disabled', true)
      for (var i=0; i<voiceMailList.length; i++){
        var item = voiceMailList[i]
        if (item.id == id){
          voiceMailList[i].processed = true
          break
        }
      }
    }
  });
}
var deleteArray = []
function selectionHandler(elm){
  if ($(elm).prop("checked")){
    deleteArray = []
    for (var item of voiceMailList){
      var eid = "#sel_"+ item.id
      $(eid).prop('checked', true);
      deleteArray.push(item.id)
      $("#delete_item").attr("disabled", false);
    }
  }else{
    for (var item of voiceMailList){
      var eid = "#sel_"+ item.id
      $(eid).prop('checked', false);
    }
    deleteArray = []
    $("#delete_item").attr("disabled", true);
  }
}

function selectForDelete(id){
  var eid = "#sel_"+ id
  if ($(eid).prop("checked")){
    deleteArray.push(id)
  }else{
    for (var i = 0; i < deleteArray.length; i++){
      if (deleteArray[i] == id){
        deleteArray.splice(i, 1)
        break
      }
    }
  }
  if (deleteArray.length)
    $("#delete_item").attr("disabled", false);
  else
    $("#delete_item").attr("disabled", true);
}

function confirmDelete(){
  var r = confirm("Are you sure you want to delete all selected items?");
  if (r == true) {
    deleteSelectedItems()
  }
}

function deleteSelectedItems(){
  if (deleteArray.length){
    var url = "deleteitem?items=" + JSON.stringify(deleteArray)
    var getting = $.get( url );
    getting.done(function( res ) {
      //alert("res" + JSON.stringify(res))
      if (res.status == "ok"){
        readVoiceMail()
      }else
        alert(res.message)
    });
    deleteArray = []
    $("#delete_item").attr("disabled", true);
  }
}
/*
function changeOrderedType(){
  var type = $("#ordered_option").val()
  if (type == "urgency"){
    sortedByUrgency = true
    $("#date_time").text("Date/Time")
    $("#date_time").attr("disabled", true);
    $("#urgency").attr("disabled", false);
    if (assend){
      $("#urgency").text("Urgency\u2193")
    }else{
      $("#urgency").text("Urgency\u2191")
    }
  }else{
    sortedByUrgency = false
    $("#urgency").text("Urgency")
    $("#urgency").attr("disabled", true);
    $("#date_time").attr("disabled", false);
    if (assend){
      voiceMailList.sort(sortUrgencyAssend)
      $("#date_time").text("Date/Time\u2193")
    }else{
      voiceMailList.sort(sortUrgencyDessend)
      $("#date_time").text("Date/Time\u2191")
    }
  }
  sortedContentList()
  listItems()
}
*/

function sortVoicemailUrgency(){
  //var type = $("#ordered_option").val()
  //if (type == "date")
  //    return

  sortedByUrgency = true
  assend = !assend
  if (assend){
    voiceMailList.sort(sortUrgencyAssend)
    $("#urgency").text("Urgency \u2193")
  }else{
    voiceMailList.sort(sortUrgencyDessend)
    $("#urgency").text("Urgency \u2191")
  }
  $("#date_time").text("Date/Time \u2195")
  listItems()
}

function sortVoicemailDate(){
  //var type = $("#ordered_option").val()
  //if (type == "urgency")
  //    return

  sortedByUrgency = false
  assend = !assend
  if (assend){
    voiceMailList.sort(sortDateAssend)
    $("#date_time").text("Date/Time \u2193")
  }else{
    voiceMailList.sort(sortDateDessend)
    $("#date_time").text("Date/Time \u2191")
  }
  $("#urgency").text("Urgency \u2195")
  listItems()
}

function sortedContentList() {
  if (sortedByUrgency){
    if (assend)
      voiceMailList.sort(sortUrgencyAssend)
    else
      voiceMailList.sort(sortUrgencyDessend)
  }else {
    if (assend)
      voiceMailList.sort(sortDateAssend)
    else
      voiceMailList.sort(sortDateDessend)
  }
}

function sortUrgencyAssend(a, b) {
  return a.confidence - b.confidence;
}

function sortUrgencyDessend(a, b) {
  return b.confidence - a.confidence;
}

function sortDateAssend(a, b) {
  return a.date - b.date;
}

function sortDateDessend(a, b) {
  return b.date - a.date;
}
