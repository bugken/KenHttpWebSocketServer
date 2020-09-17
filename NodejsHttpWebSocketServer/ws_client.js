const WebSocket = require('ws');
const sleep = require("sleep");

var sockets = new Array()
//测试临界值为1700个client
new Promise(function(resolve, reject){
    for(i = 0; i < 500; i++)
	{
		socket = new WebSocket("ws://127.0.0.1:8888/ws");
		sockets.push(socket);
		socket.onmessage = function (event) {
			console.log("websocket client onmessage:%s.", event.data);
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
		var userid = 0;
		var json = {"id":1, "arg":{"userid":userid}};
		for(i = 0; i < sockets.length; i++)
		{
			userid = userid + 1;
			json = {"id":1, "arg":{"userid":userid}};
			str = JSON.stringify(json);
			if (socket.readyState == WebSocket.OPEN) {
				console.log("send data:%s", json);
				socket.send(str);
			} 
		}
        resolve('随便什么数据');
    }, 2000);
});
