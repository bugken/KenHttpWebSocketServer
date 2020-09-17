const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8888 });

var map_ws_userid = new Map();
var ws_nums = 1;

server.on('open', function open() {
	console.log('connected');
});

server.on('close', function close() {
	console.log('disconnected');
});

server.on('connection', function connection(ws, req) {
	const ip = req.connection.remoteAddress;
	const port = req.connection.remotePort;
	const clientName = ip + port;

	console.log('%s is connected', clientName)

	// 发送欢迎信息给客户端
	ws.send("Welcome " + clientName);

	ws.on('message', function incoming(message) {
		console.log('received: %s from %s', message, clientName);
		
		//将userid ws加入map
		ws_nums = ws_nums + 1;
		map_ws_userid.set(ws_nums, ws);
		console.log('add map_ws_userid size %d ws_nums %d', map_ws_userid.size, ws_nums);
		
		// 广播消息给所有客户端
		server.clients.forEach(function each(client) {
			if (client.readyState === WebSocket.OPEN) {
				client.send( clientName + " -> " + message);
			}
		});

	});

	ws.on('close', function close() {
		//将ws从map去掉
		for (var item of map_ws_userid.entries()) {
			if(item[1] == ws)
			{
				console.log("delete userid %d", item[0]);
				map_ws_userid.delete(item[0]);
				console.log('map_ws_userid size %d', map_ws_userid.size);
			}
		}
		console.log('close');
	});

});