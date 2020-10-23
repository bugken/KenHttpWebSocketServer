#pragma once

#include <libwebsockets.h>

#define MAX_PAYLOAD_SIZE  (10 * 1024)

#define LWS_CONTEXT_CREATION_INFO struct lws_context_creation_info
#define LWS_CONTEXT struct lws_context
#define LWS_PROTOCOLS struct lws_protocols
#define LWS struct lws
#define ENUM_CALLBACK_REASON enum lws_callback_reasons

//会话上下文对象，结构根据需要自定义
typedef struct _SESSIONDATA {
	INT32 iMsgCounts;
	unsigned char szBuffer[LWS_PRE + MAX_PAYLOAD_SIZE];
	INT32 iLen;
	bool bIsBinary;
	bool bIsFin;
}SESSIONDATA;

class WebSocketServer
{
public:
	WebSocketServer(UINT32 uiListenPort);

	~WebSocketServer();

	WebSocketServer(const WebSocketServer& That);

	INT32 GetPort();

	void Init();

	INT32 SetSSL(const char* pCAFilePath, const char* pServerCertFilePath, 
		const char* pServerPrivateKeyFilePath, bool bIsSupportSSL);

	INT32 Create();

	INT32 Run();

	void Destroy();

	void ServerStart();

private:
	UINT32  m_uiPort;//WebSocket服务端口号
};

