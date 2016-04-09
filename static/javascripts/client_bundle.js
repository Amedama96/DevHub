(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var COOKIE_NAME = "dev_hub_name";
var COOKIE_EXPIRES = 365;

function ClientViewModel(){
  var that = this;

  this.socket = io.connect('/',{query: 'from=devhub'});
  this.is_mobile = false;
  this.loginName = ko.observable($.cookie(COOKIE_NAME));
  this.loginName.subscribe(function(value){
    that.chatController.setName(value);
    that.memoController.setName(value);
  });
  this.avatar = ko.observable(window.localStorage.avatarImage != null ? window.localStorage.avatarImage : "");

  this.faviconNumber = new FaviconNumber();

  this.memoController = new ShareMemoController({
    socket: that.socket,
    setMessage: function(message){
      that.chatController.setMessage(message);
    },
    zenMode: function(){
      return that.zenMode;
    }
  });

  this.chatController = new ChatController({
    socket: that.socket,
    faviconNumber: that.faviconNumber,
    changedLoginName: function(name){
      that.memoController.setName(name);
      that.set_avatar();
    },
    showRefPoint: function(id){
      that.memoController.move(id);
    }
  });

  this.zenMode = false;

  this.init = function(){
    that.init_websocket();
    that.initSettings();

    if ($(window).width() < 768){
      that.is_mobile = true;
    }

    // for smartphone
    // 本当は bootstrap-responsive のみやりたいが、perfectScrollbar の制御は
    // js側でやらないといけないので解像度で切り分ける
    if (!that.is_mobile){
      $('body').addClass("perfect-scrollbar-body-style");

      var scrollOption = {
        wheelSpeed: 1,
        useKeyboard: true,
        suppressScrollX: true
      };

      $('#chat_area').addClass("perfect-scrollbar-style");
      $('#chat_area').perfectScrollbar(scrollOption);
      $('#memo_area').addClass("perfect-scrollbar-style");
      $('#memo_area').perfectScrollbar(scrollOption);
    }else{
      // モバイルの場合はフリックイベントでチャットとメモを切り替える
      $('.hidden-phone').remove();
      $('.visible-phone').show();
      $('.text-date').remove();
      $('.checkbox-count').remove();

      // フリック用のサイズ調整
      that.adjust_display_size_for_mobile();

      $(window).resize(function(){
        that.adjust_display_size_for_mobile();
      });

      $('#share_memo_nav').hide();
      $('#share_memo_tabbable').removeClass("tabs-left");
      $('#share_memo_nav').removeClass("nav-tabs");
      $('#share_memo_nav').addClass("nav-pills");
      $('#share_memo_nav').show();
    }

    if ( $.cookie(COOKIE_NAME) == null){
      setTimeout(function(){
        $('#name_in').modal("show");
        setTimeout(function(){
          $('#login_name').focus();
        },500);
      },500);
    }else{
      that.chatController.setName($.cookie(COOKIE_NAME));
      that.memoController.setName($.cookie(COOKIE_NAME));
      that.chatController.focus();
    }

    // ショートカットキー
    $(document).on("keyup", function (e) {
      if (e.keyCode == 27){ // ESC key return fullscreen mode.
        that.zenMode = false;
        $(".navbar").fadeIn();
        $(".dummy-top-space").fadeIn();

        $("#memo_area").removeClass("span12 memo-area-zen");
        $("#memo_area").addClass("span7 memo-area");
        $("#chat_area").removeClass("span12");
        $("#chat_area").addClass("span5");

        $("#memo_area").fadeIn();
        $("#chat_area").fadeIn();
        $("#memo_area").trigger("scroll");
      } else if (e.ctrlKey && e.ctrlKey == true ){
        /*
           if (e.keyCode == 73){ // Ctrl - i : focus chat form
           $('#message').focus();
           } else if (e.keyCode == 77){ // Ctrl - m : focus current memo form
           memoController.setFocus();
           } else if (e.keyCode == 72){ // Ctrl - h: select prev share memo
           memoController.prev();
           } else if (e.keyCode == 76){ // Ctrl - l: select next share memo
           memoController.next();
           } else if (e.keyCode == 48){ // Ctrl - 0: move top share memo
           memoController.top();
           } else if (e.keyCode == 74){ // Ctrl - j: move down share memo
           memoController.down();
           } else if (e.keyCode == 75){ // Ctrl - j: move down share memo
           memoController.up();
           }
           */
      }
    });
    $('a[rel=tooltip]').tooltip({
      placement : 'bottom'
    });
  }

  this.init_websocket = function(){
    that.socket.on('connect', function() {
      that.set_avatar();
    });

    that.socket.on('disconnect', function(){
      console.log('disconnect');
    });

    that.socket.on('set_name', function(name) {
      that.loginName(name);
    });
  }

  this.fullscreen_both = function(){
    this.zenMode = true;
    $(".navbar").fadeOut();
    $(".dummy-top-space").fadeOut();
    $("#memo_area").trigger("scroll");
  }

  this.fullscreen_memo = function(){
    this.zenMode = true;
    $(".navbar").fadeOut();
    $(".dummy-top-space").fadeOut();
    $("#chat_area").hide();
    $("#memo_area").removeClass("span7 memo-area");
    $("#memo_area").addClass("span12 memo-area-zen");
    $("#memo_area").trigger("scroll");
  }

  this.fullscreen_chat = function(){
    this.zenMode = true;
    $(".navbar").fadeOut();
    $(".dummy-top-space").fadeOut();
    $("#memo_area").hide();
    $("#chat_area").removeClass("span5");
    $("#chat_area").addClass("span12");
    $("#memo_area").trigger("scroll");
  }

  this.login_action = function(){
    var name = that.loginName();

    if ( name != "" ){
      that.set_avatar();
      that.chatController.focus();
    }
    $('#name_in').modal('hide')
  }

  this.initSettings = function(){
    var that = this;

    if(window.localStorage.popupNotification == 'true'){
      $('#notify_all').attr('checked', 'checked');
    }else if (window.localStorage.popupNotification == 'mention'){
      $('#notify_mention').attr('checked', 'checked');
    }

    $('.notify-radio').on('change', "input", function(){
      var mode = $(this).val();
      window.localStorage.popupNotification = mode;
      if (mode != "disable"){
        if(Notification){
          Notification.requestPermission();
        }
      }
    });

    if (window.localStorage.notificationSeconds){
      $('#notification_seconds').val(window.localStorage.notificationSeconds);
    }else{
      $('#notification_seconds').val(5);
      window.localStorage.notificationSeconds = 5;
    }

    $('#notification_seconds').on('change',function(){
      window.localStorage.notificationSeconds = $(this).val();
    });

    // for Timeline
    if(window.localStorage.timeline == 'own'){
      $('#mention_own_alert').show();
    }else if (window.localStorage.timeline == 'mention'){
      $('#mention_alert').show();
    }

    // for Send Message Key
    if(window.localStorage.sendkey == 'ctrl'){
      $('#send_ctrl').attr('checked', 'checked');
    }else if (window.localStorage.sendkey == 'shift'){
      $('#send_shift').attr('checked', 'checked');
    }else{
      $('#send_enter').attr('checked', 'checked');
    }

    $('.send-message-key-radio').on('change', "input", function(){
      var key = $(this).val();
      window.localStorage.sendkey = key;
    });

    // アバターフォームへのドロップ
    new DropZone({
      dropTarget: $('#avatar'),
      alertTarget: $('#loading'),
      fileTarget: $('#upload_avatar'),
      pasteValid: true,
      uploadedAction: function(self, res){
        if (res.fileName == null){ return; }
        that.avatar(res.fileName);
      }
    });

    new DropZone({
      dropTarget: $('#avatar_login'),
      alertTarget: $('#loading'),
      fileTarget: $('#upload_avatar'),
      pasteValid: true,
      uploadedAction: function(self, res){
        if (res.fileName == null){ return; }
        that.avatar(res.fileName);
      }
    });
  }

  this.upload_avatar = function(){
    $('#upload_avatar').click();
    return false;
  }

  this.set_avatar = function(){
    $.cookie(COOKIE_NAME, that.loginName(),{ expires: COOKIE_EXPIRES });
    window.localStorage.avatarImage = that.avatar();

    that.socket.emit('name',
      {
        name: that.loginName(),
        avatar: that.avatar()
      });
    return false;
  }

  this.adjust_display_size_for_mobile = function(){
    // フリック用のサイズ調整
    var window_width = $(window).width();
    $('.viewport').css('width',window_width + 'px').css('overflow','hidden').css('padding',0);
    $('.flipsnap').css('width',window_width * 2 + 'px');

    that.chatController.setWidth(window_width);
    that.memoController.setWidth(window_width);
    Flipsnap('.flipsnap').refresh();
  }
}

$(function() {
  var clientViewModel = new ClientViewModel();
  ko.applyBindings(clientViewModel);
  clientViewModel.init();
});

},{}]},{},[1]);