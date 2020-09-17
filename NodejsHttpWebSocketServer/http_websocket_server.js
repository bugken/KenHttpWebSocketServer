const WebSocket = require("ws");
const http = require("http");

const ws_server = new WebSocket.Server({ port: 8888 });
const http_server = http.createServer();
var map_ws_userid = new Map();

//在线人数查询
function query_users_online()
{
	var ret = 0;
	var counts = 300;
	
	var json = {"ret":ret, "users_online":counts};
	return json;
}
//发送数据
function broadcast_message(message)
{
	var ret = 0;
	
	var json = {"ret":ret};
	return json;
}

/*****************************************websocket server************************************************/
var ws_nums = 1;
//服务器监听时触发
ws_server.on("listening", function listen(){
	console.log("websocket server start listenning on port 8888.");
});
//接收到客户端请求时触发
ws_server.on("connection", function connection(ws, req) {
	//接收到消息
	ws.on('message', function incoming(message) {
		var json = {"id":1,"arg":{"userid":300}}
		console.log("received:%s", message);
		//将userid ws加入map
		ws_nums = ws_nums + 1;
		map_ws_userid.set(ws_nums, ws);
		console.log("add userid %d, map_ws_userid size %d", ws_nums, map_ws_userid.size);
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
			retStr = broadcast_message(data.arg);	
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