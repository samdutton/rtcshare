'use strict';

// to includet socket.io.js from node server
// would love to know if there's a better way...
(function() {
  var ga = document.createElement('script');
  ga.type = 'text/javascript';
  ga.src = 'https://samdutton-nodertc.jit.su/socket.io/socket.io.js';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(ga, s);
})();

var audioElement;
var isChannelReady;
var isInitiator;
var isStarted;
var localStream;
var pc;
var remoteStream;
var socket;
var turnReady;

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

// should change to extension install event
window.onload = init;
function init() {
//	if (typeof localStorage["capturing"] === "undefined") {
		localStorage["capturing"] = "off";
//	}
}

function handleCapture(stream){
	console.log("backround.js stream: ", stream);
	localStream = stream; // set global used by apprtc code and when stopping stream
	initialize(); // start of connection process using apprtc code below
}

function startCapture(){
	chrome.tabs.getSelected(null, function(tab) {
		var selectedTabId = tab.id;
		chrome.tabCapture.capture({audio:true, video:true}, handleCapture);
	});
}


// extension methods

var iconPath = "images/";
var iconCapture = "tabCapture22.png";
var iconPause = "pause22.png";


// when the record/pause button is clicked toggle the button icon and title
chrome.browserAction.onClicked.addListener(function(tab) {
  var currentMode = localStorage["capturing"];
  var newMode = currentMode === "on" ? "off" : "on";
  // start capture
  if (newMode === "on"){
      appendIframe(); // capture starts once iframe created
  // stop capture
  } else {
    chrome.tabs.getSelected(null, function(tab){
      console.log("stop capture! newMode :", newMode);
      var selectedTabId = tab.id;
      localStream.stop();
      onRemoteHangup();
//      chrome.tabCapture.capture(selectedTabId, {audio:false, video:false});
    });
  }
  localStorage["capturing"] = newMode;
  // if capturing is now on, display pause icon -- and vice versa
  var iconFileName = newMode === "on" ? iconPause : iconCapture;
  chrome.browserAction.setIcon({path: iconPath + iconFileName});
  var title = newMode === "on" ? "Click to stop capture" : "Click to start capture";
  chrome.browserAction.setTitle({"title": title});
});






/////////////////////////////////

var pc_config = webrtcDetectedBrowser === 'firefox' ?
  {'iceServers':[{'url':'stun:23.21.150.121'}]} : // number IP
  {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};

var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
  'OfferToReceiveAudio':true,
  'OfferToReceiveVideo':true }};

/////////////////////////////////////////////

function setupSocket(){
  // var room = location.pathname.substring(1);
  // if (room === '') {
  // //  room = prompt('Enter room name:');
  //   room = 'rtcshare';
  // } else {
  //   //
  // }

  socket = io.connect('samdutton-nodertc.jit.su')

  socket.on('created', function (room){
    console.log('Created room ' + room);
    isInitiator = true;
    // initiator does screencapture and Web Audio sharing
    console.log('starting screencapture');
    startCapture();
  });

  socket.on('full', function (room){
    console.log('Room ' + room + ' is full');
  });

  socket.on('join', function (room){
    console.log('Another peer made a request to join room ' + room);
    console.log('This peer is the initiator of room ' + room + '!');
    isChannelReady = true;
  });

  socket.on('joined', function (room){
    isInitiator = false;
    console.log('This peer has joined room ' + room);
    isChannelReady = true;
    // initiator does screencapture and Web Audio sharing
    var constraints = {video: true};
    getUserMedia(constraints, handleUserMedia, handleUserMediaError);
    console.log('Getting user media with constraints', constraints);
  });

  socket.on('log', function (array){
    console.log.apply(console, array);
  });

  ////////////////////////////////////////////////

  function sendMessage(message){
    console.log('Sending message: ', message);
    socket.emit('message', message);
  }

  socket.on('message', function (message){
    console.log('Received message:', message);
    if (message === 'got user media') {
      maybeStart();
    } else if (message.type === 'offer') {
      if (!isInitiator && !isStarted) {
        maybeStart();
      }
      pc.setRemoteDescription(new RTCSessionDescription(message));
      doAnswer();
    } else if (message.type === 'answer' && isStarted) {
      pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted) {
      var candidate = new RTCIceCandidate({sdpMLineIndex:message.label,
        candidate:message.candidate});
      pc.addIceCandidate(candidate);
    } else if (message === 'bye' && isStarted) {
      handleRemoteHangup();
    }
  });

  var room = 'rtcshare';

  if (room !== '') {
    console.log('Create or join room', room);
    socket.emit('create or join', room);
  }

  ////////////////////////////////////////////////////
}

// must wait for socket.io.js to load :(
// there must be a better way...
setTimeout(setupSocket, 1000);

function handleUserMedia(stream) {
  localStream = stream;
//  attachMediaStream(localVideo, stream);
  console.log('Adding local stream.');
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}

function handleUserMediaError(error){
  console.log('navigator.getUserMedia error: ', error);
}


// requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');

function maybeStart() {
  if (!isStarted && localStream && isChannelReady) {
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function(e){
  sendMessage('bye');
}

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(pc_config, pc_constraints);
    pc.onicecandidate = handleIceCandidate;
    console.log('Created RTCPeerConnnection with:\n' +
      '  config: \'' + JSON.stringify(pc_config) + '\';\n' +
      '  constraints: \'' + JSON.stringify(pc_constraints) + '\'.');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
      return;
  }
  pc.onaddstream = handleRemoteStreamAdded;
  pc.onremovestream = handleRemoteStreamRemoved;
}

function handleIceCandidate(event) {
  console.log('handleIceCandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate});
  } else {
    console.log('End of candidates.');
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
//  reattachMediaStream(miniVideo, localVideo);
  if (!isInitiator){
    attachMediaStream(remoteVideo, event.stream);
  }
  remoteStream = event.stream;
//  waitForRemoteVideo();
}

function doCall() {
  var constraints = {'optional': [], 'mandatory': {'MozDontOfferDataChannel': true}};
  // temporary measure to remove Moz* constraints in Chrome
  if (webrtcDetectedBrowser === 'chrome') {
    for (var prop in constraints.mandatory) {
      if (prop.indexOf('Moz') !== -1) {
        delete constraints.mandatory[prop];
      }
     }
   }
  constraints = mergeConstraints(constraints, sdpConstraints);
  console.log('Sending offer to peer, with constraints: \n' +
    '  \'' + JSON.stringify(constraints) + '\'.');
  if (isInitiator) {
    addWebAudio();
  }
  pc.createOffer(setLocalAndSendMessage, null, constraints);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
}

function mergeConstraints(cons1, cons2) {
  var merged = cons1;
  for (var name in cons2.mandatory) {
    merged.mandatory[name] = cons2.mandatory[name];
  }
  merged.optional.concat(cons2.optional);
  return merged;
}

function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

function requestTurn(turn_url) {
  var turnExists = false;
  for (var i in pc_config.iceServers) {
    if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turn_url);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pc_config.iceServers.push({
          'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turn_url, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
 // reattachMediaStream(miniVideo, localVideo);
  attachMediaStream(remoteVideo, event.stream);
  remoteStream = event.stream;
//  waitForRemoteVideo();
}
function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  // isAudioMuted = false;
  // isVideoMuted = false;
  pc.close();
  pc = null;
}

///////////////////////////////////////////

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        mLineIndex = i;
        break;
      }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}

///////////////////////////////////

// add stream from Web Audio
function addWebAudio(){
  // cope with browser differences
  var context;
  if (typeof webkitAudioContext === "function") {
    context = new webkitAudioContext();
  } else if (typeof AudioContext === "function") {
    context = new AudioContext();
  } else {
    alert("Sorry! Web Audio is not supported by this browser");
  }

  // use the audio element to create the source node
  audioElement = document.createElement("Audio"); // global scope, for console
  audioElement.src = 'audio/human-voice.wav';
  audioElement.loop = true;
  var sourceNode = context.createMediaElementSource(audioElement);
//  sourceNode.loop = true;
  //audioElement.addEventListener('loadedmetadata', function(){console.log('loadedmetadata')});

  // connect the source node to a filter node
  var filterNode = context.createBiquadFilter();
  // see https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html#BiquadFilterNode-section
  filterNode.type = 1; // HIGHPASS
  // cutoff frequency: for HIGHPASS, audio is attenuated below this frequency
  sourceNode.connect(filterNode);

  // connect the filter node to a gain node (to change audio volume)
  var gainNode = context.createGainNode();
  // default is 1 (no change); less than 1 means audio is attenuated, and vice versa
  gainNode.gain.value = 0.5;
  filterNode.connect(gainNode);

  var mediaStreamDestination = context.createMediaStreamDestination();
  gainNode.connect(mediaStreamDestination);
  pc.addStream(mediaStreamDestination.stream);
  audioElement.play();
  console.log('audioElement play() called, mediaStreamDestination.stream: ', mediaStreamDestination.stream);
}
