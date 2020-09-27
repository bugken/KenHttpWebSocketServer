const WebSocket = require("ws");
const http = require("http");
const util = require("util");

const websocket_server_port = 9001;
const http_server_port = 9002;

const ws_server = new WebSocket.Server({ port: websocket_server_port });
const http_server = http.createServer();
var map_ws_userid = new Map();
var map_userid_login_message = new Map();
var login_message_to_all = "";
var maintenance_message = "";

//打印在线人数信息，包括在线人数数量和useid
function dump_users_info()
{
	console.log("ws_server.clients.size:%d", ws_server.clients.size);
	console.log("map_ws_userid size:%d", map_ws_userid.size);
	for (var item of map_ws_userid.entries()) {
		console.log("userid:%d online.", item[0]);
	}
}
function dump_login_messages()
{
	console.log("login message size:%d", array_login_messages.length());
	//遍历message
}
//在线人数查询
function query_users_online()
{
	var counts = ws_server.clients.size;
	var json = {"ret":0, "users_online":counts};
	return json;
}
//广播数据给用户 type 1:弹窗消息 2:维护消息
function broadcast_message(type, message)
{
	for (var item of map_ws_userid.entries()) 
	{
		json = {"id":200001, "arg":{"type":type, "message": message}};  //200001:客户端弹窗消息
		str = JSON.stringify(json);
		console.log("send to: %d msg: %s", item[0], str);

		item[1].send(str);
	}
}
//发送消息给特定玩家 type 1:弹窗消息 2:维护消息
function notify_message(userid, type, message)
{
	var ret = 0;
	if(map_ws_userid.has(userid))
	{
		var ws = map_ws_userid.get(userid);
		json = {"id":200001, "arg":{"type":type, "message":message}};  
		str = JSON.stringify(json);
		console.log("send to: %d msg: %s", userid, str);

		ws.send(str);
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
		ret = notify_message(json_data.userid, 1, json_data.message);
		if(ret == -1)
		{
			error_message = util.format("userid:%d 不在线", json_data.userid);
		}
	}
	else if(json_data.userid == 0)
	{
		//广播消息
		broadcast_message(1, json_data.message);
	}
	else
	{
		ret = -1;
		error_message = util.format("userid %d 不正确", json_data.userid);
	}
	var json = {"ret":ret, "error_message":error_message};
	return json;
}
//保存登录信息
function save_login_message(json_data)
{
	var ret = 0;
	var error_message = "";
	if(json_data.userid > 0)
	{		
		if(json_data.type == 0)
		{
			map_userid_login_message.delete(json_data.userid);
		}
		else//保存登录消息
		{
			map_userid_login_message.set(json_data.userid, json_data.message);
		}
	}
	else if(json_data.userid == 0)
	{
		if(json_data.type == 0)
		{
			login_message_to_all = "";
		}
		else//保存登录消息
		{
			login_message_to_all = json_data.message;
		}
	}
	else
	{
		ret = -1;
		error_message = util.format("userid %d 不正确", json_data.userid);
	}
	var json = {"ret":ret, "error_message":error_message};
	return json;
}
//删除登录消息
function delete_login_message(json_data)
{
	//var pos = fruits.indexOf('Banana');
	//var removedItem = fruits.splice(pos, 1); // this is how to remove an item
}
//处理登录与弹框消息
function handle_pop_login_message(json_data)
{
	var ret = 0;
	var error_message = "";
	if(json_data.userid > 0)
	{
		if(json_data.type == 0)
		{
			map_userid_login_message.delete(json_data.userid);
		}
		else
		{
			//保存到特定玩家的登录消息
			map_userid_login_message.set(json_data.userid, json_data.message);
			//弹框提示
			notify_message(json_data.userid, 1, json_data.message);
		}
	}
	else if(json_data.userid == 0)
	{
		if(json_data.type == 0)
		{
			login_message_to_all = "";
		}
		else
		{
			login_message_to_all = json_data.message;
			//弹窗提示
			broadcast_message(1, json_data.message);
		}
	}
	else
	{
		ret = -1;
		error_message = util.format("userid %d 不正确", json_data.userid);
	}
	var json = {"ret":ret, "error_message":error_message};
	return json;
}
/*****************************************http server************************************************/
//监听端口
http_server.listen(http_server_port, "0.0.0.0");
//设置超时时间
http_server.setTimeout(5 * 60 * 1000);
//服务器监听时触发
http_server.on("listening", function () {
	console.log('http server start listenning on port %d.', http_server_port);
});
//接收到客户端请求时触发
http_server.on("request", function (req, res) {
	//获取http请求传入的数据(json数据)
	var data = "";  
	var datajson = "";
	var retStr = {"ret":-1, "error_message":"json error or json id not exist!"};
	req.on("data",function(chunk){  
		data += chunk;  
	}); 
	req.on("end",function(){  
		console.log("http received data from web:%s", data);
		try
		{
			datajson = JSON.parse(data);  
			if(datajson.id == 100000)//打印在线人数信息，包括在线人数数量和useid
			{
				dump_users_info();
				retStr = {"ret":0, "error_message":""};
				console.log("reply to web:%s", JSON.stringify(retStr));
				res.end(JSON.stringify(retStr));
			}
			else if(datajson.id == 100001)//在线人数
			{
				retStr = query_users_online();
				console.log("reply to web:%s", JSON.stringify(retStr));
				res.end(JSON.stringify(retStr));
			}
			else if(datajson.id == 100002)//发送弹窗消息
			{
				retStr = send_message(datajson.arg);
				console.log("reply to web:%s", JSON.stringify(retStr));	
				res.end(JSON.stringify(retStr));
			}
			else if(datajson.id == 100003)//保存登录消息
			{
				retStr = save_login_message(datajson.arg);
				console.log("reply to web:%s", JSON.stringify(retStr));	
				res.end(JSON.stringify(retStr));
			}
			else if(datajson.id == 100004)//维护消息
			{
				if(datajson.arg.type == 1)
				{
					maintenance_message = datajson.arg.message;
					broadcast_message(2, maintenance_message);
				}
				else if(datajson.arg.type == 0)
				{
					maintenance_message = "";
				}
				retStr = {"ret":0, "error_message":""};
				console.log("reply to web:%s", JSON.stringify(retStr));
				res.end(JSON.stringify(retStr));
			}
			else if(datajson.id == 100005)//登录与弹窗消息
			{
				retStr = handle_pop_login_message(datajson.arg);
				console.log("reply to web:%s", JSON.stringify(retStr));	
				res.end(JSON.stringify(retStr));
			}
			else
			{
				console.log("reply to web:%s", JSON.stringify(retStr));
				res.end(JSON.stringify(retStr));
			}
		}
		catch(e)
		{
			console.log("Exception error:%s", e.message);
			res.end(JSON.stringify(retStr));
		}
	});   
});
//连接建立时触发
http_server.on("connection", function (socket) {
	//console.log('建立连接');
	return;
});
//客户端向服务器发送CONNECT请求时触发
http_server.on("connect", function (req, socket, head) {
	//console.log('客户端connect');
	return;
});
//服务器关闭时触发，调用 close() 方法。
http_server.on("close", function () {
	//console.log('服务器关闭');
	return;
});
//发生错误时触发
http_server.on("error", function (err) {
	console.log(err);
});
//如果连接超过指定时间没有响应，则触发。超时后，不可再复用已建立的连接，需发请求重新建立连接
http_server.on("timeout", function (socket) {
	//console.log("连接已超时");
	return;
});

/*****************************************websocket server************************************************/
//针对userid == 0的发送函数
function ws_notify_message(ws)
{
	var type = 0;
	var message = "";
	if(login_message_to_all != "")
	{
		type = 1;
		message = login_message_to_all;
	}
	if(maintenance_message != "")//维护消息优先级比较高
	{
		type = 2;
		message = maintenance_message;
	}

	if(message != "")
	{
		json = {"id":200001, "arg":{"type":type, "message":message}};
		str = JSON.stringify(json);
		console.log("send to: %d msg: %s", 0, str);
		ws.send(str);
	}
}
//服务器监听时触发
ws_server.on("listening", function listen(){
	console.log("websocket server start listenning on port %d.", websocket_server_port);
});
//接收到客户端请求时触发
ws_server.on("connection", function connection(ws, req) {
	//接收到消息
	ws.on('message', function incoming(message) {
		try
		{
			console.log("ws receive message:%s", message);
			datajson = JSON.parse(message);  
			/*
			*连接成功时接收客户端信息
			*{"id":100001, "arg":{"userid":1154}}
			*/
			if(datajson.id == 100001)
			{
				var userid = datajson.arg.userid;
				if(maintenance_message != "")
				{
					ws_notify_message(ws);
					return;
				}
				if(userid == 0)
				{
					ws_notify_message(ws);
				}
				else
				{
					//将userid ws加入map
					map_ws_userid.set(userid, ws);
				}
			}
			/*
			*客户端请求登录弹窗消息
			*{"id":100002, "arg":{"userid":1154}}
			*/
			else if(datajson.id == 100002)
			{
				var userid = datajson.arg.userid;
				if(userid == 0)
				{
					ws_notify_message(ws);
				}
				if(maintenance_message != "")
				{
					notify_message(userid, 2, maintenance_message);
					return;
				}
				if(map_userid_login_message.has(userid))//针对特定用户的登录弹窗
				{
					notify_message(userid, 1, map_userid_login_message.get(userid));
				}
				//userid=0的时候已经发送登录消息
				if(login_message_to_all != "")
				{
					notify_message(userid, 1, login_message_to_all);
				}
			}
		}
		catch(e)
		{
			console.log("Exception error:%s", e.message);
		}
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