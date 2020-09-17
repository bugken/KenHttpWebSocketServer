const WebSocket = require('ws');

for(i = 0; i < 1; i++)
{
	socket = new WebSocket("ws://127.0.0.1:8888/ws");
	socket.onmessage = function (event) {
		console.log("websocket client onmessage.");
	};
	socket.onopen = function (event) {
		console.log("websocket client onopen.");
		if (socket.readyState == WebSocket.OPEN) {
			socket.send("I'm websocket client!");
		} 
	};
	socket.onclose = function (event) {
		console.log("websocket client onclose.");
	};
}
