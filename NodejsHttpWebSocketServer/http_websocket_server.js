const WebSocket = require("ws");
const http = require("http");
const util = require("util");
const fs = require('fs');
const moment = require('moment');
const g_messages = require('./messages.json');
const g_interval = setInterval(fixup_users_online, 10*60*1000);

const g_websocket_server_port = 9001;
const g_http_server_port = 9002;
const g_ws_server = new WebSocket.Server({ port: g_websocket_server_port });
const g_http_server = http.createServer();

var g_map_ws_container = new Map();
var g_map_userid_login_message = new Map();
var g_login_message_to_all = "";
var g_maintenance_message = "";
var g_switch_more_log = 1;
var g_switch_less_log = 1;//针对http和弹框消息	
var g_log_file = "ws_http.log";
var g_message_file = "messages.json";

//定时清理函数
function fixup_users_online(){
	var size =  g_map_ws_container.size;
	if(g_map_ws_container.size > 0){
		for (var item of g_map_ws_container.entries()) {
			item[1].close();
			var user_info = util.format("fixup_users_online userid:%d close.", item[0]);
			log_writer(user_info);
			if(g_switch_more_log == 1)
				console.log(user_info);
		}
	}
	var msg = util.format("fixup_users_online fixup users size:%d", size);
	log_writer(msg);
	if(g_switch_less_log == 1)
		console.log(msg);
}
//登录消息，维护消息初始化与持久化
g_maintenance_message = g_messages["maintenance_message"];
g_login_message_to_all = g_messages["login_message"];
var msg = util.format("read maintenance message:%s", g_maintenance_message);
console.log(msg);
log_writer(msg);
msg = util.format("read login message:%s", g_login_message_to_all);
console.log(msg);
log_writer(msg);
//保存消息到文件
function save_msg_to_file(){
	var json_src = {"maintenance_message":g_maintenance_message, "login_message":g_login_message_to_all};
	var jsonstr = JSON.stringify(json_src);
	fs.appendFileSync(g_message_file, jsonstr, {flag:'w'});
}
//写日志
function log_writer(log_message){
	var date = moment().format("YYYY-MM-DD HH:mm:ss");
	fs.appendFileSync(g_log_file, "[".concat(date).concat("]").concat(log_message).concat("\n"),{flag:'a'});
}
//打印在线人数信息，包括在线人数数量和useid
function dump_users_info(){
	var clients_size = util.format("dump_users_info g_ws_server.clients.size:%d", g_ws_server.clients.size);
	console.log(clients_size);
	log_writer(clients_size);
	var map_size = util.format("dump_users_info g_map_ws_container size:%d", g_map_ws_container.size);
	console.log(map_size);
	log_writer(map_size);

	for (var item of g_map_ws_container.entries()) {
		var user_info = util.format("dump_users_info userid:%d online.", item[0]);
		console.log(user_info);
		log_writer(user_info);
	}
	json = {"ret":0, "error_message":""};
	return json;
}
//读取登录信息、维护信息内容
function dump_message(){
	var msg = util.format("dump_message g_maintenance_message:%s", g_maintenance_message);
	console.log(msg);
	log_writer(msg);
	msg = util.format("dump_message login message to all:%s", g_login_message_to_all);
	console.log(msg);
	log_writer(msg);

	for (var item of g_map_userid_login_message.entries()) {
		msg = util.format("dump_message message to userid:%d %s.", item[0], item[1]);
		console.log(msg);
		log_writer(msg);
	}
	json = {"ret":0, "error_message":""};
	return json;
}
//清空所有登录信息，维护信息
function clear_message(){
	var msg = util.format("clear_message");
	log_writer(msg);
	if(g_switch_less_log == 1)
		console.log(msg);

	g_maintenance_message = "";
	g_login_message_to_all = "";
	g_map_userid_login_message.clear();
	save_msg_to_file();//更新文件
	json = {"ret":0, "error_message":""};
	return json;
}
//清空单个用户登录信息，单个用户登录信息不写文件
function clear_userid_login_msg(json_data){
	var msg = util.format("clear_userid_login_msg userid:%d", json_data.userid);
	log_writer(msg);
	if(g_switch_less_log == 1)
		console.log(msg);

	var error_message = "";
	if(g_map_userid_login_message.has(json_data.userid)){
		g_map_userid_login_message.delete(json_data.userid);
	}else{
		error_message = util.format("there is no login message for userid:%d", json_data.userid);
		log_writer(error_message);
	}
	json = {"ret":0, "error_message":error_message};
	return json;
}
//打印信息开关
function log_switch(json_data){
	var msg = util.format("log_switch log_more:%d log_less:%d", json_data.log_more, json_data.log_less);
	log_writer(msg);
	if(g_switch_less_log == 1)
		console.log(msg);

	if(json_data.log_more == 0)//关闭log
		g_switch_more_log = 0;
	else if(json_data.log_more == 1)
		g_switch_more_log = 1;
	if(json_data.log_less == 0)//http收发消息开关
		g_switch_less_log = 0;
	else if(json_data.log_less == 1)
		g_switch_less_log = 1;
	json = {"ret":0, "error_message":""};
	return json;
}
//在线人数查询
function query_users_online(){
	//var counts = g_ws_server.clients.size;
	var counts = g_map_ws_container.size;
	var json = {"ret":0, "users_online":counts};
	return json;
}
//查询用户是否在线
function query_user_is_online(json_data){
	var status = "offline"
	if(json_data.userid > 0){		
		if(g_map_ws_container.has(json_data.userid))
			status = "online";
	}
	var msg = util.format("user:%d now is %s", json_data.userid, status);
	log_writer(msg);
	if (g_switch_less_log == 1)
		console.log(msg);
	var json = {"ret":0, "return_message":status};
	return json;
}
//广播数据给用户 type 1:弹窗消息 2:维护消息
function broadcast_message(type, message){
	for (var item of g_map_ws_container.entries()) {
		json = {"id":200001, "arg":{"type":type, "message": message}};  //200001:客户端弹窗消息
		str = JSON.stringify(json);
		item[1].send(str);

		var msg = util.format("broadcast_message userid:%d(%s) type:%d message:%s.",item[0], item[1]._socket.remoteAddress, type, message);
		log_writer(msg);
		if (g_switch_less_log == 1)
			console.log(msg);
	}
}
//发送消息给特定玩家 type 1:弹窗消息 2:维护消息
function notify_message(userid, type, message){
	var ret = 0;
	var msg = "";
	if(g_map_ws_container.has(userid)){
		var ws = g_map_ws_container.get(userid);
		json = {"id":200001, "arg":{"type":type, "message":message}};  
		str = JSON.stringify(json);
		ws.send(str);
		msg = util.format("notify_message send to: %d(%s) msg: %s", userid, ws._socket.remoteAddress, str);
	}
	else{
		ret = -1;
		msg = util.format("notify_message userid:%d 不在线", userid);
	}
	log_writer(msg);
	if (g_switch_less_log == 1)
		console.log(msg);

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
function update_login_message(json_data){
	var msg = util.format("update_login_message type:%d userid:%d message:%s.", json_data.type, json_data.userid, json_data.message);
	if(g_switch_less_log == 1)
		console.log(msg);
	log_writer(msg);

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
	save_msg_to_file();//持久化
	var json = {"ret":ret, "error_message":error_message};
	return json;
}
//处理登录与弹框消息
function handle_pop_login_message(json_data){
	var msg = util.format("handle_pop_login_message type:%d userid:%d message:%s.", json_data.type, json_data.userid, json_data.message);
	if(g_switch_less_log == 1)
		console.log(msg);
	log_writer(msg);

	var ret = 0;
	var error_message = "";
	if(json_data.userid > 0){
		if(json_data.type == 0)
			g_map_userid_login_message.delete(json_data.userid);
		else{
			g_map_userid_login_message.set(json_data.userid, json_data.message);//保存到特定玩家的登录消息
			notify_message(json_data.userid, 1, json_data.message);//弹框提示
		}
	}
	else if(json_data.userid == 0){
		if(json_data.type == 0)
			g_login_message_to_all = "";
		else{
			g_login_message_to_all = json_data.message;
			broadcast_message(1, json_data.message);//弹窗提示
		}
	}
	else{
		ret = -1;
		error_message = util.format("userid %d 不正确", json_data.userid);
	}
	save_msg_to_file();//持久化

	var json = {"ret":ret, "error_message":error_message};
	return json;
}
//踢玩家下线
function kickoff_user(json_data){
	var error_message = "";
	var ret = 0;
	ret = notify_message(json_data.userid, 3, json_data.message);
	if(ret == -1){
		error_message = util.format("userid:%d 不在线", json_data.userid);
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
	var log_message = util.format("http server start listenning on port %d.", g_http_server_port);
	console.log(log_message);
	log_writer(log_message);
});
//接收到客户端请求时触发
g_http_server.on("request", function (req, res) {
	var data = "";  
	var datajson = "";
	var retStr = {"ret":-1, "error_message":"json error or json id not exist!"};
	req.on("data",function(chunk){//获取http请求传入的数据(json数据)
		data += chunk;  
	}); 
	req.on("end",function(){
		var log_message = util.format("http received data from web(%s):%s", req.connection.remoteAddress, data);  
		log_writer(log_message);
		if (g_switch_less_log == 1)
			console.log(log_message);

		try{
			datajson = JSON.parse(data);  
			if(datajson.id == 900001)//打印在线人数信息，包括在线人数数量和useid
				retStr = dump_users_info();
			else if(datajson.id == 900002)//读取登录信息、维护信息内容
				retStr = dump_message();
			else if(datajson.id == 900003)//清除登录信息、维护信息
				retStr = clear_message();
			else if(datajson.id == 900004)//日志开关
				retStr = log_switch(datajson.arg);
			else if(datajson.id == 900005)//清除单个用户登录弹框消息
				retStr = clear_userid_login_msg(datajson.arg);
			else if(datajson.id == 900006)//查询用户是否在线
				retStr = query_user_is_online(datajson.arg);
/*********************************内部与外部消息分割*********************************************/	
			else if(datajson.id == 100001)//在线人数
				retStr = query_users_online();
			else if(datajson.id == 100002)//发送弹窗消息
				retStr = send_message(datajson.arg);
			else if(datajson.id == 100003)//保存登录消息
				retStr = update_login_message(datajson.arg);
			else if(datajson.id == 100004){//维护消息
				if(datajson.arg.type == 1){
					g_maintenance_message = datajson.arg.message;
					broadcast_message(2, g_maintenance_message);
				}
				else if(datajson.arg.type == 0){
					g_maintenance_message = "";
				}
				save_msg_to_file();
				retStr = {"ret":0, "error_message":""};
			}
			else if(datajson.id == 100005)//登录与弹窗消息
				retStr = handle_pop_login_message(datajson.arg);
			else if(datajson.id == 100006)//踢用户下线
				retStr = kickoff_user(datajson.arg);

			res.end(JSON.stringify(retStr));
			var log_message = util.format("reply to web(%s):%s", req.connection.remoteAddress, JSON.stringify(retStr));
			log_writer(log_message);
			if (g_switch_less_log == 1)
				console.log(log_message);
		}
		catch(e){
			res.end(JSON.stringify(retStr));

			var log_message = util.format("Exception error:%s", e.message);
			console.log(log_message);
			log_writer(log_message);
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
		if (g_switch_more_log == 1)
			console.log("send to: %d(%s) msg: %s", 0, ws._socket.remoteAddress, str);
		ws.send(str);
	}
}
//服务器监听时触发
g_ws_server.on("listening", function listen(){
	var log_message = util.format("websocket server start listenning on port %d.", g_websocket_server_port);
	console.log(log_message);
	log_writer(log_message);
});
//接收到客户端请求时触发
g_ws_server.on("connection", function connection(ws, req) {
	//接收到消息
	ws.on('message', function incoming(message) {
		try{
			if (g_switch_more_log == 1)
				console.log("from ws(%s) receive message:%s",ws._socket.remoteAddress, message);
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
					g_map_ws_container.set(userid, ws);
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
			var log_message = util.format("Exception error:%s", e.message);
			console.log(log_message);
			log_writer(log_message);
		}
	});
	//客户端关闭调用
	ws.on("close", function close() {
		//将ws从map去掉
		for (var item of g_map_ws_container.entries()) {
			if(item[1] == ws){
				g_map_ws_container.delete(item[0]);
				item[1].close();//关闭socket
				if (g_switch_more_log == 1)
					console.log("delete userid %d(%s), g_map_ws_container size %d", item[0], item[1]._socket.remoteAddress, g_map_ws_container.size);
				break;
			}
		}
	});
});