#pragma once

#include <libwebsockets.h>

#define MAX_PAYLOAD_SIZE  (10 * 1024)

//会话上下文对象，结构根据需要自定义
struct session_data {
	int msg_count;
	unsigned char buf[LWS_PRE + MAX_PAYLOAD_SIZE];
	int len;
	bool bin;
	bool fin;
};

class WebSocketServer
{
public:
	WebSocketServer(UINT32 uiListenPort);

	~WebSocketServer();

	WebSocketServer(const WebSocketServer& That);

	INT32 GetPort();

	void Init();

	INT32 SetSSL(const char* pCAFilePath, const char* pServerCertFilePath, const char* pServerPrivateKeyFilePath, bool bIsSupportSSL);

	INT32 Create();

	INT32 Run(UINT32 uiWaitTimeMs);

	void Destroy();

private:
	UINT32  m_uiPort;//WebSocket服务端口号
};

