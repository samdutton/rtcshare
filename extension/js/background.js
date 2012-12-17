var config;

window.onload = init;
function init() {
//	if (typeof localStorage["capturing"] === "undefined") {
	console.log("window.onload");
		localStorage["capturing"] = "off";
//	}
}

function appendIframe(){
	var iframe = document.createElement("iframe");
	iframe.src="http://localhost:8086";
	document.body.appendChild(iframe);
	iframe.onload = function(){
		iframe.contentWindow.postMessage("Hi from background.js", "*");
	};
}

window.addEventListener("message", function(event) {
	config = JSON.parse(event.data);
  console.log("Got message in background.js: ", config);
});


// extension methods

var iconPath = "images/";
var iconCapture = "tabCapture22.png";
var iconPause = "pause22.png";


function handleCapture(localMediaStream){
	console.log(localMediaStream);
}

// when the record button is clicked:
// - toggle the button icon and title
chrome.browserAction.onClicked.addListener(function(tab) {
	var currentMode = localStorage["capturing"];
	var newMode = currentMode === "on" ? "off" : "on";
	if (newMode === "on"){
		chrome.tabs.getSelected(null, function(tab) {
			console.log("capture! newMode :", newMode);
//			var selectedTabId = tab.id;
			// start capture
			appendIframe();
//			chrome.tabCapture.capture(selectedTabId, {audio:true, video:true}, handleCapture);
		});
	} else {
		chrome.tabs.getSelected(null, function(tab){
			console.log("stop! newMode :", newMode);
//			var selectedTabId = tab.id;
			// stop capture
//			chrome.tabCapture.capture(selectedTabId, {audio:false, video:false});
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

