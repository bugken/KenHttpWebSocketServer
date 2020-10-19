const mssql = require("mssql");
const util = require("util");
const moment = require("moment");
const common = require("./common");

var config = {
  user: 'sa',
  password: '123456',
  server: 'localhost', 
  database: '9lottery',
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

function db_execute_sql(sql, params, callBack) {
  var connection = new mssql.ConnectionPool(config, function (err) {
      var ps = new mssql.PreparedStatement(connection);
      if (params != "") {
          for (var index in params) {
              if (typeof params[index] == "number") {
                ps.input(index, mssql.Int);
              } else if (typeof params[index] == "string") {
                ps.input(index, mssql.NVarChar);
              }
            }
      }
      ps.prepare(sql, function (err) {
          if (err){
            var msg = util.format("db_execute_sql prepare %s", err);
            console.log(msg);
            common.log_writer(msg);
          }
          ps.execute(params, function (err, recordset) {
            callBack(err, recordset);
            if (err){
              var msg = util.format("db_execute_sql execute %s", err);
              console.log(msg);
              common.log_writer(msg);
            }
            ps.unprepare(function (err) {});
          });
      });
  });
};

function db_sql_execute_cb(error, result)
{
  //处理错误与结果
  return;
}

function db_users_online_writer(users_num)
{
  var sql_str = "insert into tab_Game_Users_Online_Stat(UsersNumOnline)Values(@UsersNumOnline);"
  var params = {UsersNumOnline:users_num};

  db_execute_sql(sql_str, params, db_sql_execute_cb);
} 

function db_update_last_online_time(users_id)
{
  var sql_str = "update tb_user_GameOnlineRecord set InsertTime = @InsertTime where RoomID = @RoomID;";
  var params = {InsertTime:moment().format("YYYY-MM-DD HH:mm:ss"), RoomID:112};

  db_execute_sql(sql_str, params, db_sql_execute_cb);
} 

module.exports = {
  db_users_online_writer
}