const WebSocket = require("ws");
const http = require("http");
const util = require("util");

const g_websocket_server_port = 9001;
const g_http_server_port = 9002;

const g_ws_server = new WebSocket.Server({ port: g_websocket_server_port });
const g_http_server = http.createServer();
var g_map_ws_userid = new Map();
var g_map_userid_login_message = new Map();
var g_login_message_to_all = "";
var g_maintenance_message = "";
var g_log_switch = 1;
var g_log_switch_http = 1;//只针对http的请求与回复消息

//打印在线人数信息，包括在线人数数量和useid
function dump_users_info(){
	console.log("g_ws_server.clients.size:%d", g_ws_server.clients.size);
	console.log("g_map_ws_userid size:%d", g_map_ws_userid.size);
	for (var item of g_map_ws_userid.entries()) {
		console.log("userid:%d online.", item[0]);
	}
}
//读取登录信息、维护信息内容
function dump_message(){
	console.log("maintenance message:%s", g_maintenance_message);
	console.log("login message to all:%s", g_login_message_to_all);
	for (var item of g_map_userid_login_message.entries()) {
		console.log("message to userid:%d %s.", item[0], item[1]);
	}
}
//清空登录信息，维护信息
function clear_message(){
	g_maintenance_message = "";
	g_login_message_to_all = "";
	g_map_userid_login_message.clear();
}
//打印信息开关
function log_switch(json_data){
	var ret = 0;
	var error_message = "";
	if(json_data.operation == 0)//关闭log
		g_log_switch = 0;
	else if(json_data.operation == 1)
		g_log_switch = 1;
	if(json_data.op_http == 0)//http收发消息开关
		g_log_switch_http = 0;
	else if(json_data.op_http == 1)
		g_log_switch_http = 1;
	var json = {"ret":ret, "error_message":error_message};
	return json;
}
//在线人数查询
function query_users_online(){
	//var counts = g_ws_server.clients.size;
	var counts = g_map_ws_userid.size;
	var json = {"ret":0, "users_online":counts};
	return json;
}
//广播数据给用户 type 1:弹窗消息 2:维护消息
function broadcast_message(type, message){
	for (var item of g_map_ws_userid.entries()) {
		json = {"id":200001, "arg":{"type":type, "message": message}};  //200001:客户端弹窗消息
		str = JSON.stringify(json);
		if (g_log_switch == 1)
			console.log("send to: %d msg: %s", item[0], str);

		item[1].send(str);
	}
}
//发送消息给特定玩家 type 1:弹窗消息 2:维护消息
function notify_message(userid, type, message){
	var ret = 0;
	if(g_map_ws_userid.has(userid)){
		var ws = g_map_ws_userid.get(userid);
		json = {"id":200001, "arg":{"type":type, "message":message}};  
		str = JSON.stringify(json);
		if (g_log_switch == 1)
			console.log("send to: %d msg: %s", userid, str);

		ws.send(str);
	}
	else{
		if (g_log_switch == 1)
			console.log("userid %d 不在线", userid);
		ret = -1;
	}
	return ret;
}
//发送数据
function send_message(json_data){
	var ret = 0;
	var error_message = "";
	if(json_data.userid > 0){//发送消息给特定玩家玩家
		var ret = 0;
		ret = notify_message(json_data.userid, 1, json_data.message);
		if(ret == -1)
			error_message = util.format("userid:%d 不在线", json_data.userid);
	}
	else if(json_data.userid == 0)//广播消息
		broadcast_message(1, json_data.message);
	else{
		ret = -1;
		error_message = util.format("userid %d 不正确", json_data.userid);
	}
	var json = {"ret":ret, "error_message":error_message};
	return json;
}
//保存或清除登录信息
function save_login_message(json_data){
	var ret = 0;
	var error_message = "";
	if(json_data.userid > 0){		
		if(json_data.type == 0)
			g_map_userid_login_message.delete(json_data.userid);
		else//保存登录消息
			g_map_userid_login_message.set(json_data.userid, json_data.message);
	}
	else if(json_data.userid == 0){
		if(json_data.type == 0)
			g_login_message_to_all = "";
		else
			g_login_message_to_all = json_data.message;
	}
	else{
		ret = -1;
		error_message = util.format("userid %d 不正确", json_data.userid);
	}
	var json = {"ret":ret, "error_message":error_message};
	return json;
}
//处理登录与弹框消息
function handle_pop_login_message(json_data){
	var ret = 0;
	var error_message = "";
	if(json_data.userid > 0){
		if(json_data.type == 0)
			g_map_userid_login_message.delete(json_data.userid);
		else{
			//保存到特定玩家的登录消息
			g_map_userid_login_message.set(json_data.userid, json_data.message);
			//弹框提示
			notify_message(json_data.userid, 1, json_data.message);
		}
	}
	else if(json_data.userid == 0){
		if(json_data.type == 0)
			g_login_message_to_all = "";
		else{
			g_login_message_to_all = json_data.message;
			//弹窗提示
			broadcast_message(1, json_data.message);
		}
	}
	else{
		ret = -1;
		error_message = util.format("userid %d 不正确", json_data.userid);
	}
	var json = {"ret":ret, "error_message":error_message};
	return json;
}
/*****************************************http server************************************************/
//监听端口
g_http_server.listen(g_http_server_port, "0.0.0.0");
//设置超时时间
g_http_server.setTimeout(5 * 60 * 1000);
//服务器监听时触发
g_http_server.on("listening", function () {
	console.log('http server start listenning on port %d.', g_http_server_port);
});
//接收到客户端请求时触发
g_http_server.on("request", function (req, res) {
	//获取http请求传入的数据(json数据)
	var data = "";  
	var datajson = "";
	var retStr = {"ret":-1, "error_message":"json error or json id not exist!"};
	req.on("data",function(chunk){  
		data += chunk;  
	}); 
	req.on("end",function(){  
		if (g_log_switch_http == 1)
			console.log("http received data from web:%s", data);
		try{
			datajson = JSON.parse(data);  
			if(datajson.id == 900001){//打印在线人数信息，包括在线人数数量和useid
				dump_users_info();
				retStr = {"ret":0, "error_message":""};
			}
			if(datajson.id == 900002){//读取登录信息、维护信息内容
				dump_message();
				retStr = {"ret":0, "error_message":""};
			}
			if(datajson.id == 900003){//读取登录信息、维护信息内容
				clear_message();
				retStr = {"ret":0, "error_message":""};
			}
			if(datajson.id == 900004){//日志开关
				log_switch(datajson.arg);
				retStr = {"ret":0, "error_message":""};
			}
			else if(datajson.id == 100001)//在线人数
				retStr = query_users_online();
			else if(datajson.id == 100002)//发送弹窗消息
				retStr = send_message(datajson.arg);
			else if(datajson.id == 100003)//保存登录消息
				retStr = save_login_message(datajson.arg);
			else if(datajson.id == 100004){//维护消息
				if(datajson.arg.type == 1){
					g_maintenance_message = datajson.arg.message;
					broadcast_message(2, g_maintenance_message);
				}
				else if(datajson.arg.type == 0){
					g_maintenance_message = "";
				}
				retStr = {"ret":0, "error_message":""};
			}
			else if(datajson.id == 100005)//登录与弹窗消息
				retStr = handle_pop_login_message(datajson.arg);
			if (g_log_switch_http == 1)
				console.log("reply to web:%s", JSON.stringify(retStr));
			res.end(JSON.stringify(retStr));
		}
		catch(e){
			console.log("Exception error:%s", e.message);
			res.end(JSON.stringify(retStr));
		}
	});   
});
//连接建立时触发
g_http_server.on("connection", function (socket) {
	return;
});
//客户端向服务器发送CONNECT请求时触发
g_http_server.on("connect", function (req, socket, head) {
	return;
});
//服务器关闭时触发，调用 close() 方法。
g_http_server.on("close", function () {
	return;
});
//发生错误时触发
g_http_server.on("error", function (err) {
	console.log(err);
});
//如果连接超过指定时间没有响应，则触发。超时后，不可再复用已建立的连接，需发请求重新建立连接
g_http_server.on("timeout", function (socket) {
	return;
});

/*****************************************websocket server************************************************/
//针对userid == 0的发送函数
function ws_notify_message(ws){
	var type = 0;
	var message = "";
	if(g_login_message_to_all != ""){
		type = 1;
		message = g_login_message_to_all;
	}
	if(g_maintenance_message != ""){//维护消息优先级比较高
		type = 2;
		message = g_maintenance_message;
	}

	if(message != ""){
		json = {"id":200001, "arg":{"type":type, "message":message}};
		str = JSON.stringify(json);
		if (g_log_switch == 1)
			console.log("send to: %d msg: %s", 0, str);
		ws.send(str);
	}
}
//服务器监听时触发
g_ws_server.on("listening", function listen(){
	console.log("websocket server start listenning on port %d.", g_websocket_server_port);
});
//接收到客户端请求时触发
g_ws_server.on("connection", function connection(ws, req) {
	//接收到消息
	ws.on('message', function incoming(message) {
		try{
			if (g_log_switch == 1)
				console.log("ws receive message:%s", message);
			datajson = JSON.parse(message);  
			//客户端向服务端发送的第一条消息，告诉服务端用户的信息
			if(datajson.id == 100001){
				var userid = datajson.arg.userid;
				if(g_maintenance_message != ""){
					ws_notify_message(ws);
					return;
				}
				if(userid == 0)
					ws_notify_message(ws);
				else//将userid ws加入map
					g_map_ws_userid.set(userid, ws);
			}
			//向服务端请求弹窗信息
			else if(datajson.id == 100002){
				var userid = datajson.arg.userid;
				if(userid == 0)
					ws_notify_message(ws);
				if(g_maintenance_message != ""){
					notify_message(userid, 2, g_maintenance_message);
					return;
				}
				if(g_map_userid_login_message.has(userid))//针对特定用户的登录弹窗
					notify_message(userid, 1, g_map_userid_login_message.get(userid));
				if(g_login_message_to_all != "")
					notify_message(userid, 1, g_login_message_to_all);
			}
		}
		catch(e){
			console.log("Exception error:%s", e.message);
		}
	});
	//客户端关闭调用
	ws.on("close", function close() {
		//将ws从map去掉
		for (var item of g_map_ws_userid.entries()) {
			if(item[1] == ws){
				g_map_ws_userid.delete(item[0]);
				if (g_log_switch == 1)
					console.log("delete userid %d, g_map_ws_userid size %d", item[0], g_map_ws_userid.size);
			}
		}
	});
});