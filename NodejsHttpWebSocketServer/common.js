const fs = require('fs');
const moment = require('moment');

var g_log_file = "ws_http.log";
var g_message_file = "messages.json";
const g_messages = require('./messages.json');

//写日志
function log_writer(log_message){
	var date = moment().format("YYYY-MM-DD HH:mm:ss");
	fs.appendFileSync(g_log_file, "[".concat(date).concat("]").concat(log_message).concat("\n"),{flag:'a'});
}
//保存消息到文件
function save_msg_to_file(json_src){
	//var json_src = {"maintenance_message":g_maintenance_message, "login_message":g_login_message_to_all, "announcement_message":g_announcement_message};
	var jsonstr = JSON.stringify(json_src);
	fs.appendFileSync(g_message_file, jsonstr, {flag:'w'});
}

module.exports = {
    log_writer,
    save_msg_to_file, 
    g_messages
  }