// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {

  var cur_video_blob = null;
  var fb_instance;

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();
    //$("#recorded_video").hover(clear_video);
  });
/*
  function clear_video() {
    setTimeout(function() {
       $("#recorded_video").empty();
    }, 2000);
  }
*/
  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://natasha-preston-1.firebaseio.com/");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("/#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({who:"",m:"Share this url with your friend to join this chat: "+ document.location.origin+"/#"+fb_chat_room_id,c:"red"})

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({who:"",m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    username = window.prompt("Welcome, warrior! please declare your name?");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

    // bind submission box
    $("#submission input").keydown(function( event ) {
      if (event.which == 13) {
        var curr_emotion = has_emotions($(this).val());
        if(curr_emotion){
          fb_instance_stream.push({who:username, m:$(this).val(), v:cur_video_blob, c: my_color, emotion:curr_emotion});
        }else{
          fb_instance_stream.push({who:username, m:$(this).val(), c: my_color});
        }
        $(this).val("");
        scroll_to_bottom(0);
      }
    });

    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  // creates a message node and appends it to the conversation
  function display_msg(data){
    if(!data.v) {
      $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.who + ": " + data.m+"</div>");
    } else if(data.v) {
      $("#conversation").append("<span class='msg' style='color:"+data.c+"'>"+data.who + ": " + "</span>");
      var message = data.m;
      var messageArray = message.split(" ");
      var delayPerWord = 0;
      var delayForNewLine = messageArray.length * 25;

      //to get color of emotion
      var emotion = data.emotion;
      var color = "#FFFFFF";
      if(emotion == ":)" || emotion == ":-)") {
          color = "#FFFD91"; //happy color
      } else if(emotion == "lol" || emotion == ":D" || emotion == ":-D") {
          color = "#FA9D07"; //laughter color
      } else if(emotion == ":(" || emotion == ":-(" || emotion == ":'-(") {
          color = "#2B619E"; //sad color
      } else if(emotion == ":o" || emotion == "o_o" || emotion == ":-o") {
          color = "#F06237"; //surprise color
      } else if(emotion == ";)" || emotion == ";-)") {
          color = "#ADEB42"; //wink color
      } else if(emotion == "<3") {
          color = "#F748AB"; //love color
      } else if(emotion == ":/" || emotion == ":-/" || emotion == "=/") {
          color = "#917E43"; //skeptical color
      }
      $("#topBox").css("background-color", color);
      $("#bottomBox").css("background-color", color);
      //var color = "#FFFFFF";

      // to get text to appear word by word, foreshadowing video
      var whereToAppend = $("#conversation");
      var wordColor = data.c;
      var addTextByDelay = function(messageArray, whereToAppend, delay) {
        if(messageArray.length > 0) {
          whereToAppend.append("<span style='color:"+wordColor+"'>"+messageArray[0] + " </span>");
          setTimeout(function() {
            addTextByDelay(messageArray.slice(1), whereToAppend, delay);
          }, delay);
        }
      }
      addTextByDelay(messageArray, whereToAppend, delayPerWord);
      setTimeout(function() {
        $("#conversation").append("<br/>");
      }, delayForNewLine);

      // for video element
      var video1 = document.createElement("video");
      
      video1.autoplay = true;
      video1.controls = false; // optional
      video1.loop = true;
      video1.width = 1000;

      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(data.v));
      source.type =  "video/webm";

      video1.appendChild(source);
      if(username != data.who) {
        setTimeout(function() {
          $("#bottomBox").fadeIn(delayForNewLine*3);
        }, 100);
        setTimeout(function() {
          document.getElementById("recorded_video").appendChild(video1);
          $("#bottomBox").show();
          $("#topBox").show();
          $("#word").show();
          $("#word").text(emotion);
          /*
          emotionText = document.createTextNode(emotion);
          console.log("emoticon: " + emotionText);
          var emotionPar = document.createElement('p');
          emotionPar.appendChild(emotionText);
          document.getElementById("word").appendChild(emotionPar);
          */
          //$("#recorded_video").animate({opacity, 'hide'}, 2000);
          /*
          setTimeout(function() {
            $("#recorded_video").fadeOut();
          }, 2000);
    */
          //to make the video disappear
          setTimeout(function() {
            $("#recorded_video").empty();
            $("#word").hide();
            $("#bottomBox").fadeOut('slow');
            $("#topBox").hide();
          }, 2000);
        }, delayForNewLine+200);
      }

      // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
      // var video = document.createElement("img");
      // video.src = URL.createObjectURL(base64_to_blob(data.v));
      
      //this line was from starter code to add video into conversation
      //document.getElementById("conversation").appendChild(video1);
    }
  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("html, body").animate({ scrollTop: $(document).height() }, 200);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 160;
      var video_height= 120;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);

      // counter
      var time = 0;
      var second_counter = document.getElementById('second_counter');
      var second_counter_update = setInterval(function(){
        second_counter.innerHTML = time++;
      },1000);

      // now record stream in 5 seconds interval
      var video_container = document.getElementById('video_container');
      var mediaRecorder = new MediaStreamRecorder(stream);
      var index = 1;

      mediaRecorder.mimeType = 'video/webm';
      // mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;

      mediaRecorder.ondataavailable = function (blob) {
          //console.log("new data available!");
          video_container.innerHTML = "";

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            cur_video_blob = b64_data;
          });
      };
      setInterval( function() {
        mediaRecorder.stop();
        mediaRecorder.start(1700);
      }, 1700 );
      console.log("connect to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  // check to see if a message qualifies to be replaced with video.
  var has_emotions = function(msg){
    var options = [":-)",":)",":D",":-D","lol",":(",":'(",":'-(",":o",":-o","o_o",";)",";-)", "<3",":/",":-/","=/"];
    for(var i=0;i<options.length;i++){
      if(msg.indexOf(options[i])!= -1){
        /*
        if(i <= 1) {
          return "#FFFD91"; //happy color
        } else if(i >=2 && i <= 4) {
          return "#FA9D07"; //laughter color
        } else if(i>=5 && i <=7) {
          return "#2B619E"; //sad color
        } else if(i>=8 && i <= 10) {
          return "#F06237"; //surprise color
        } else if(i>=11 && i <= 12) {
          return "#ADEB42"; //wink color
        } else if(i==13) {
          return "#F748AB"; //love color
        } else if(i>=14 && i<= 16) {
          return "#917E43"; //skeptical color
        }
        */
        return options[i];
        //console.log("return: " + options[i]);
      }
    }
    return undefined;
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
