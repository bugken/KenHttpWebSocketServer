const WebSocket = require('ws');
const sleep = require("sleep");

var sockets = new Array()
//测试临界值为1700个client
new Promise(function(resolve, reject){
    for(i = 0; i < 1; i++)
	{
		socket = new WebSocket("ws://127.0.0.1:9001/ws");
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
		for(i = 0; i < sockets.length; i++)
		{
			userid = userid + 1;
			socket = sockets.pop();
			var json_100001 = {"id":100001, "arg":{"userid":userid}};
			var str_100001 = JSON.stringify(json_100001);
			var json_100002 = {"id":100002, "arg":{"userid":userid}};
			var str_100002 = JSON.stringify(json_100002);
			if (socket.readyState == WebSocket.OPEN) {
				console.log("send data:%s", str_100001);
				socket.send(str_100001);
				console.log("send data:%s", str_100002);
				socket.send(str_100002);
			} 
		}
        resolve('随便什么数据');
    }, 1000);
});
