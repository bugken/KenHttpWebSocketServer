const mssql = require('mssql');
const util = require("util");
const moment = require("moment");

var db = {};
var config = {
  user: 'sa',
  password: '123456',
  server: 'localhost', 
  database: 'GoldGameMainDB',
  port:1433,
  options: {
    encrypt: false, // Use this if you're on Windows Azure
    enableArithAbort: true
  },
  pool: {
    min: 0,
    max: 10,
    idleTimeoutMillis: 3000
  }
};

var querySql = function (sql, params, callBack) {
  var connection = new mssql.ConnectionPool(config, function (err) {
      var ps = new mssql.PreparedStatement(connection);
      
      if (params != "") {
          for (var index in params) {
            console.log("----------------------");
            console.log("typeof params[index]:%s",typeof params[index]);
            console.log(params[index]);
            console.log(typeof(index));
            console.log(index);
            console.log("----------------------");
              if (typeof params[index] == "number") {
                ps.input(index, mssql.Int);
              } else if (typeof params[index] == "string") {
                ps.input(index, mssql.NVarChar);
              }
            }
      }
      
      //ps.input("InsertTime", mssql.DateTime);
      //ps.input("RoomID", mssql.int);
      ps.prepare(sql, function (err) {
          if (err)
              console.log(err);
          ps.execute(params, function (err, recordset) {
              callBack(err, recordset);
              ps.unprepare(function (err) {
                  if (err)
                      console.log(err);
              });
          });
      });
  });
};

// 查询所有的用户信息
get_all_users = function get_all_users() {
  var conn = new mssql.ConnectionPool(config);
  var req = new mssql.Request(conn);
  conn.connect(function (err) {
      if (err) {
          console.log(err);
          return;
      }
      // 查询t_user表
      var sql_select = "SELECT top 10 * FROM tb_sys_Mail";
      //在线人数统计
      var sql_insert = util.format("insert into tb_user_GameOnlineRecord(RoomID, GameID, UsersNumber, RobotsNumber)Values(111, 111, %d, %d);",1000, 2000);
      //离线时间更新
      var sql_update = util.format("update tb_user_GameOnlineRecord set InsertTime= where RoomID = %d;", 119, 111);
      console.log(moment().format("YYYY-MM-DD HH:mm:ss"));
      req.query("update tb_user_GameOnlineRecord set InsertTime= @date where RoomID = 112;", function (err, recordset) {
          if (err) {
              console.log(err);
              conn.close();
              return;
          }
          else {
              console.log(recordset);
          }
          conn.close();
      });
  });
}

var sql_str = "update tb_user_GameOnlineRecord set InsertTime = @InsertTime where RoomID = @RoomID;";
params = {InsertTime:moment().format("YYYY-MM-DD HH:mm:ss"), RoomID:112};
querySql(sql_str, params, function(err, result){
  if(err){
    console.log(err);
    return;
  }
  console.log(result);
});
module.exports = db;