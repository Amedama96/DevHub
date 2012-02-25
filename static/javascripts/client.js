var latest_login_list = []
var suggest_obj = undefined;
var LOGIN_COLOR_MAX = 10
var COOKIE_NAME = "dev_hub_name";

$(function() {
  init_websocket();

  if ( $.cookie(COOKIE_NAME) == null  ){
    $('#name_in').modal("show")
    $('#login_name').focus();
  }else{
    $('#name').val($.cookie(COOKIE_NAME));
    $('#message').focus();
  }
});

function init_websocket(){
  var socket = io.connect('/');
  socket.on('connect', function() {
    //console.log('connect');
    socket.emit('name', {name: $.cookie(COOKIE_NAME)});
  });

  socket.on('disconnect', function(){
    //console.log('disconnect');
  });

  // for chat
  socket.on('message', function(data) {
    append_msg(data)
  });

  socket.on('list', function(login_list) {
    $('#login_list_loader').hide();
    latest_login_list = login_list

    var out_list = ""
    for (var i = 0; i < login_list.length; ++i){
      if ( login_list[i].pomo_min > 0 ){
        out_list += '<span class="login-name-pomo">' + login_list[i].name + ' <span class="pomo-min">' + login_list[i].pomo_min + 'min</span></span>'
      }else{
        out_list += '<span class="login-name' + login_list[i].id % LOGIN_COLOR_MAX + '">' + login_list[i].name + '</span>'
      }
    }
      
    if ($('#login_list').html() != out_list){
      $('#login_list').html(out_list);
      $('#login_list').fadeIn();
      suggest_start(login_list);
    }
  });

  socket.on('latest_log', function(msgs) {
    for ( var i = 0 ; i < msgs.length; i++){
      append_msg(msgs[i])
    }
  });

  $('#form').submit(function() {
    var name = $('#name').val();
    var message = $('#message').val();
    $.cookie(COOKIE_NAME,name);

    if ( message && name ){
      var send_msg = "[" + name + "] " + message;
      socket.emit('message', {name:name,msg:message});
      $('#message').attr('value', '');
    }
    return false;
  });

  $('#sync_text').click(function(){
    $('#code').val($('#code_out').text());
    $('#code').focus();
  });

  $('#suspend_text').click(function(){
    code_prev = $('#code_out').text();
    socket.emit('suspend_text');
    $('#code').val("");
    $('#code').focus();
  });

  $('#pomo').click(function(){
    var name = $('#name').val();
    var message = $('#message').val();
    $.cookie(COOKIE_NAME,name);

    $('#message').attr('value', '');
    socket.emit('pomo', {name: name, msg: message});
    return false;
  });

  $('#login').click(function(){
    var name = $('#login_name').val();
    if ( name != "" ){
      $.cookie(COOKIE_NAME,name);
      socket.emit('name', {name: $.cookie(COOKIE_NAME)});
      $('#name').val($.cookie(COOKIE_NAME));
      $('#message').focus();
    }
    $('#name_in').modal('hide')
  });

  $('#login_form').submit(function(){
    var name = $('#login_name').val();
    if ( name != "" ){
      $.cookie(COOKIE_NAME,name);
      socket.emit('name', {name: $.cookie(COOKIE_NAME)});
      $('#name').val($.cookie(COOKIE_NAME));
      $('#message').focus();
    }
    $('#name_in').modal('hide')
    return false;
  });
    
  // for share memo
  socket.on('text', function(text_log) {
    $('#text_writer').html('Updated by <span style="color: orange;">' + text_log.name + "</span> at " + text_log.date);
    $('#text_writer').show();
    $('#code_out').text(text_log.text);

    var logs_dl = "<dl>"
    logs_dl += '<dt><span class="label label-info">' + text_log.name + " at " + text_log.date + '</span></dt>'
    logs_dl += "<dd><pre>" + text_log.text + "</pre></dd>"
    logs_dl += "</dl>"
    $('#current_log').html(logs_dl);
 
  });

  socket.on('text_logs', function(text_logs){
    var logs_dl = $("<dl/>")
    for ( var i = 0; i < text_logs.length; ++i){
      var text_log_id = "text_log_id_" + text_logs[i].id
      
      var log_div = $("<div/>").attr("id", text_log_id)
      var log_dt = $("<dt/>")
      var writer_label = $("<span/>").addClass("label").text( text_logs[i].name + " at " + text_logs[i].date )
      var icon = $("<i/>").addClass("icon-repeat")
      var restore_btn = $('<button class="btn btn-mini restore_button"><i class="icon-share-alt"></i> Restore</button>').click(function(){
        var restore_text = text_logs[i].text
        return function(){
          code_prev = $('#code_out').text();
          $('#code').val(restore_text)
          $('#share-memo-tab').click()
          $('html,body').animate({ scrollTop: 0 }, 'slow');
        }
      }())

      var remove_btn = $('<a href="#" class="remove_text">x</a>').click(function(){
        var target_dom_id = text_log_id
        var target_log_id = text_logs[i].id
        return function(){
          $('#' + target_dom_id).fadeOut()
          socket.emit('remove_text', target_log_id);
          return false;
        }
      }())

      var log_dd = $("<dd/>")
      var log_pre = $("<pre/>").text(text_logs[i].text)

      log_dt.append(writer_label).append(restore_btn).append(remove_btn)
      log_dd.append(log_pre)
      log_div.append(log_dt).append(log_dd)
      logs_dl.append(log_div)
    }
    $('#history_logs').empty();
    $('#history_logs').append(logs_dl);

    $('#update_log_notify').show();
    $('#update_log_notify').fadeOut(2000,function(){ $(this).hide()});

  });

  var code_prev = $('#code').val();
  var loop = function() {
    var code = $('#code').val();
    var code_out = $('#code_out').text();
    if (code_prev != code && code_out != code) {
      socket.emit('text',code);
      code_prev = code;
    }
    setTimeout(loop, 200);
  };
  loop();
};

function suggest_start(list){
  var suggest_list = []
  for (var i = 0; i < list.length; ++i){
    suggest_list.push(">" + list[i].name);
  }

  if (suggest_obj == undefined){
    suggest_obj = new Suggest.LocalMulti("message", "suggest", suggest_list, {dispAllKey: false, prefix: true});
  }else{
    suggest_obj.candidateList = suggest_list;
  }
}

function append_msg(data){
  //TODO: System メッセージを非表示にする。
  //      切り替え可能にするかは検討する。
  if (data.name == "System") { return }

  var msg_li = $('<li/>').attr('style','display:none').html(get_msg_body(data) + ' <span style="color: #ccc;">(' + data.date + ')</span>');

  $('#list').prepend(msg_li);
  msg_li.fadeIn('slow');
};

function get_msg_body(data){
  var date = new Date();
  var id = date.getTime();

  var name_class = "login-name";
  var msg_color = "#555";

  data.id = get_id(data.name)

  if ( data.name == "System" ){
    name_class = "login-name-system";
    msg_color = "#aaa";
  }else if ( data.name == "Ext" ){
    name_class = "login-name-ext";
    msg_color = "#aaa";
  }else if ( data.name == "Pomo" ){
    name_class = "login-name-pomosys";
    msg_color = "orange";
  }else{
    name_class = "login-name" + data.id % LOGIN_COLOR_MAX
    msg_color = "#555";
  }

  return '<span class="' + name_class + '">' + data.name + '</span> <span class="msg_text" style="color: ' + msg_color + ';">' + decorate_msg(data.msg) + '</span>';
}

function decorate_msg(msg){
  var deco_msg = msg;
  var other_name = get_other_name(msg)

  if ( is_login_name(other_name.name) ){
    deco_msg = deco_msg.replace(other_name.area,function(){ return '<span style="color: red;">' + other_name.area + '</span>' ;});
  }

  deco_msg = deco_msg.replace(/((https?|ftp)(:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+))/g,function(){ return '<a href="' + RegExp.$1 + '" target="_blank" >' + RegExp.$1 + '</a>' });

  deco_msg = deco_msg.replace(/(SUCCESS)/, function(){ return '<span style="color: limegreen;">' + RegExp.$1 + '</span>'});
  deco_msg = deco_msg.replace(/(FAILURE)/, function(){ return '<span style="color: red;">' + RegExp.$1 + '</span>'});

  return deco_msg;
};

function get_other_name(msg){
  var match_area = ""
  var other_name = ""
  msg.replace(/((>|＞)[ ]*(.+?)( |$))/,function(){ 
    match_area = RegExp.$1
    other_name = RegExp.$3
  });
  return {name: other_name, area: match_area }
};

function is_login_name(name){
  for(var i = 0; i < latest_login_list.length; ++i ){
    if ( latest_login_list[i].name == name ){
      return true;
    }
  }
  return false;
}

function get_id(name){
  for(var i = 0; i < latest_login_list.length; ++i ){
    if ( latest_login_list[i].name == name ){
      return latest_login_list[i].id;
    }
  }
  return 0;
}

