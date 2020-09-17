const WebSocket = require("ws");
const http = require("http");
const util = require("util");

const ws_server = new WebSocket.Server({ port: 8888 });
const http_server = http.createServer();
var map_ws_userid = new Map();

//在线人数查询
function query_users_online()
{
	var counts = ws_server.clients.size;;
	var json = {"ret":0, "users_online":counts};
	return json;
}
//广播数据给用户
function broadcast_message(message)
{
	for (var item of map_ws_userid.entries()) {
		item[1].send(message);
	}
}
//发送消息给特定玩家
function notify_message(userid, message)
{
	var ret = 0;
	if(map_ws_userid.has(userid))
	{
		var ws = map_ws_userid.get(userid);
		ws.send(message);
	}
	else
	{
		console.log("userid %d 不在线", userid);
		ret = -1;
	}
	return ret;
}
//发送数据
function send_message(json_data)
{
	var ret = 0;
	var error_message = "";
	if(json_data.userid > 0)
	{
		//发送消息给特定玩家玩家
		var ret = 0;
		ret = notify_message(json_data.userid, json_data.message);
		if(ret == -1)
		{
			error_message = util.format("userid:%d 不在线", json_data.userid);
		}
	}
	else if(json_data.userid == 0)
	{
		//广播消息
		broadcast_message(json_data.message);
	}
	else
	{
		ret = -1;
		error_message = util.format("userid %d 不正确", json_data.userid);
	}
	var json = {"ret":ret, "error_message":error_message};
	return json;
}

/*****************************************websocket server************************************************/
/*
{"id":1, "arg":{"userid":123}}
*/
//服务器监听时触发
ws_server.on("listening", function listen(){
	console.log("websocket server start listenning on port 8888.");
});
//接收到客户端请求时触发
ws_server.on("connection", function connection(ws, req) {
	//接收到消息
	ws.on('message', function incoming(message) {
		var data = JSON.parse(message); 
		//将userid ws加入map
		var userid = data.arg.userid;
		map_ws_userid.set(userid, ws);
		console.log("add userid %d, map_ws_userid size %d", userid, map_ws_userid.size);
	});
	//客户端关闭调用
	ws.on("close", function close() {
		//将ws从map去掉
		for (var item of map_ws_userid.entries()) {
			if(item[1] == ws)
			{
				map_ws_userid.delete(item[0]);
				console.log("delete userid %d, map_ws_userid size %d", item[0], map_ws_userid.size);
			}
		}
	});
});


/*****************************************http server************************************************/
/*
{"id":1, "arg":{}}
{"id":2, "arg":{"userid":234, "message":"nihao"}}//userid为0时候,发消息给所有玩家,userid不为0时候,发送消息给该玩家
*/
//监听端口
http_server.listen(8889, "0.0.0.0");
//设置超时时间
http_server.setTimeout(5 * 60 * 1000);
//服务器监听时触发
http_server.on("listening", function () {
	console.log('http server start listenning on port 8889.');
});
//接收到客户端请求时触发
http_server.on("request", function (req, res) {
	//获取http请求传入的数据(json数据)
	var data = "";  
	var retStr = {"ret":1, "error_message":"json id not exist!"};
	req.on("data",function(chunk){  
		data += chunk;  
	}); 
	req.on("end",function(){  
		data = JSON.parse(data);  
		if(data.id == 1)//在线人数
		{
			retStr = query_users_online();
			res.end(JSON.stringify(retStr));
		}
		else if(data.id == 2)//发送消息
		{
			retStr = send_message(data.arg);	
			res.end(JSON.stringify(retStr));
		}
		else
		{
			res.end(JSON.stringify(retStr));
		}
	});   
});
//连接建立时触发
http_server.on("connection", function (socket) {
	console.log('建立连接');
});
//客户端向服务器发送CONNECT请求时触发
http_server.on("connect", function (req, socket, head) {
	console.log('客户端connect');
});
//服务器关闭时触发，调用 close() 方法。
http_server.on("close", function () {
	console.log('服务器关闭');
});
//发生错误时触发
http_server.on("error", function (err) {
	console.log(err);
});
//如果连接超过指定时间没有响应，则触发。超时后，不可再复用已建立的连接，需发请求重新建立连接
http_server.on("timeout", function (socket) {
	console.log("连接已超时");
});