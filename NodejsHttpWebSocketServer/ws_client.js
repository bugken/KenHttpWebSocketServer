const WebSocket = require('ws');
const sleep = require("sleep");

var sockets = new Array()
//测试临界值为1700个client
new Promise(function(resolve, reject){
    for(i = 0; i < 1; i++)
	{
		var socket = new WebSocket("ws://127.0.0.1:8888/ws");
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
		var userid = 0;
		var json_info = {"id":100001, "arg":{"userid":userid}};
		var json_ask_message = {"id":100002, "arg":{"userid":userid}};
		var number_sockets = sockets.length;
		console.log("start send data. sockets size %d.", sockets.length);
		for(i = 0; i < number_sockets; i++)
		{
			s = sockets.pop();
			userid = userid + 1;
			json_info = {"id":100001, "arg":{"userid":userid}};
			str = JSON.stringify(json_info);
			if (s.readyState == WebSocket.OPEN) {
				console.log("send data:%s", str);
				s.send(str);
			} 
			json_ask_message = {"id":100002, "arg":{"userid":userid}};
			str = JSON.stringify(json_ask_message);
			if (s.readyState == WebSocket.OPEN) {
				console.log("send data:%s", str);
				s.send(str);
			} 
		}
        resolve('随便什么数据');
    }, 1000);
});