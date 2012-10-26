// chrome.browserAction.setBadgeBackgroundColor({"color": [0, 200, 0, 100]});

// function initBrowserAction(request) {
	// if (request.numVideos > 0) {
		// var numVideos = request.numVideos.toString();
		// chrome.browserAction.setBadgeText({"text": numVideos});
		// chrome.browserAction.setTitle({"title": numVideos + " video element(s) found on this page. \nClick to view stored framegrabs, or save framegrabs \nby using the icons overlaid on the video(s)."});
	// }
// }

function stopPlaying(){
// 	console.log("clearSpokenSubtitleBacklog()");
}


chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
		var response = {};
		// when changing language or toggling "Speak subtitles" from popup,
		// clear the backlog of cues to be translated and spoken
		if (request.type === "") {

		} else if (request.type === "getSettings") {

		} else {
			alert("Unknown request type in background.html: " + request.type);
		}
		sendResponse(response);  // allows request to be cleaned up -- otherwise it stays open
	}
);

// tab selection changed
chrome.tabs.onSelectionChanged.addListener(
	function handleSelectionChange(tabId, selectInfo) {
		stopPlaying();
	}
);


// e.g. tab url changed
chrome.tabs.onUpdated.addListener(
	function handleUpdate(tabId, selectInfo) {
		stopPlaying();
	}
);

