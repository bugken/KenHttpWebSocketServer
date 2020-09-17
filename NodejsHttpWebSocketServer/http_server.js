const http = require('http');

//创建一个http服务器
let server = http.createServer();
//监听端口
server.listen(8888, '0.0.0.0');
//设置超时时间
server.setTimeout(5 * 60 * 1000);
//服务器监听时触发
server.on('listening', function () {
	console.log('监听开始');
});
//在线人数
function query_users_online()
{
	var ret = 0;
	var counts = 300;
	
	var json = {"ret":a, "users_online":counts};
	return json;
}
//发送数据
function broadcast_message(message)
{
	var ret = 0;
	
	var json = {"ret":ret};
	return json;
}
//接收到客户端请求时触发
server.on('request', function (req, res) {
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
server.on('connection', function (socket) {
	console.log('建立连接');
});
//客户端向服务器发送CONNECT请求时触发
server.on('connect', function (req, socket, head) {
	console.log('客户端connect');
});
//服务器关闭时触发，调用 close() 方法。
server.on('close', function () {
	console.log('服务器关闭');
});
//发生错误时触发
server.on('error', function (err) {
	console.log(err);
});
//如果连接超过指定时间没有响应，则触发。超时后，不可再复用已建立的连接，需发请求重新建立连接
server.on('timeout', function (socket) {
	console.log('连接已超时');
});