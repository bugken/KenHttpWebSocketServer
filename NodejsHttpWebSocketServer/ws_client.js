const WebSocket = require('ws');
const sleep = require("sleep");

var sockets = new Array()
//测试临界值为1700个client
new Promise(function(resolve, reject){
    for(i = 0; i < 1; i++)
	{
		socket = new WebSocket("ws://127.0.0.1:8888/ws");
		sockets.push(socket);
		socket.onmessage = function (event) {
			console.log("websocket client onmessage.");
		};
		socket.onopen = function (event) {
			console.log("websocket client onopen.");
		};
		socket.onclose = function (event) {
			console.log("websocket client onclose.");
		};
	}
    setTimeout(function(){
        console.log("start send data. sockets size %d.", sockets.length);
		for(i = 0; i < sockets.length; i++)
		{
			if (socket.readyState == WebSocket.OPEN) {
				socket.send("I'm websocket client!");
			} 
		}
        resolve('随便什么数据');
    }, 2000);
});
