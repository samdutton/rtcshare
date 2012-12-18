// should change to extension install event
window.onload = init;
function init() {
//	if (typeof localStorage["capturing"] === "undefined") {
		localStorage["capturing"] = "off";
//	}
}

// append iframe, then send it a message to get config details
// once the config message is received, capture starts
function appendIframe(){
	var iframe = document.createElement("iframe");
	iframe.src="http://localhost:8086";
	document.body.appendChild(iframe);
	iframe.onload = function(){
		iframe.contentWindow.postMessage("sendConfig", "*");
	};
}

function handleCapture(localMediaStream){
	console.log(localMediaStream);
}

function startCapture(){
	chrome.tabs.getSelected(null, function(tab) {
		var selectedTabId = tab.id;
		chrome.tabCapture.capture({audio:true, video:true}, handleCapture);
	});
}

var config;
// when config is received, start capture
window.addEventListener("message", function(event) {
	config = JSON.parse(event.data);
  console.log("Got message in background.js: ", config);
  startCapture();
});


// extension methods

var iconPath = "images/";
var iconCapture = "tabCapture22.png";
var iconPause = "pause22.png";


// when the record/pause button is clicked toggle the button icon and title
chrome.browserAction.onClicked.addListener(function(tab) {
	var currentMode = localStorage["capturing"];
	var newMode = currentMode === "on" ? "off" : "on";
	if (newMode === "on"){
			appendIframe(); // capture starts once iframe created
	} else { // turn off capture
		chrome.tabs.getSelected(null, function(tab){
			console.log("stop capture! newMode :", newMode);
			var selectedTabId = tab.id;
			chrome.tabCapture.capture(selectedTabId, {audio:false, video:false});
		});
	}
	localStorage["capturing"] = newMode;
	// if capturing is now on, display pause icon and vice versa
	var iconFileName = newMode === "on" ? iconPause : iconCapture;
	chrome.browserAction.setIcon({path: iconPath + iconFileName});
	var title = newMode === "on" ? "Click to stop capture" : "Click to start capture";
	chrome.browserAction.setTitle({"title": title});
});

// chrome.extension.onMessage.addListener(
// 	function(request, sender, sendResponse) {
// 		var response = {};
// 		if (request.type === "playSound") {
// 			}
// 		} else {
// 			console.log("Unknown request type in background.html: " + request.type);
// 		}
// 		sendResponse(response);  // allows request to be cleaned up -- otherwise it stays open
// 	}
// );

// // tab selection changed
// chrome.tabs.onSelectionChanged.addListener(
// 	function handleSelectionChange(tabId, selectInfo) {
// 	}
// );


// // e.g. tab url changed
// chrome.tabs.onUpdated.addListener(
// 	function handleUpdate(tabId, selectInfo) {
// 	}
// );


///////////////////////////////////////////////

