#include "WebSocketServer.h"

static LWS_CONTEXT_CREATION_INFO g_stContextInfo = { 0 };
static LWS_CONTEXT* g_pContext = NULL;

//构造函数
WebSocketServer::WebSocketServer(UINT32 uiListenPort)
{
	m_uiPort = uiListenPort;
}

//析构函数
WebSocketServer::~WebSocketServer()
{
	lwsl_notice("析构完成\n");
}

//拷贝构造
WebSocketServer::WebSocketServer(const WebSocketServer& That)
{
	m_uiPort = That.m_uiPort;
}

//获取端口号
INT32 WebSocketServer::GetPort()
{
	return m_uiPort;
}

//服务器底层实现的回调函数
static INT32 WSProtocolCallback(LWS* pWSI, ENUM_CALLBACK_REASON eReason,
	void *pUser, void *pInData, size_t iLen)
{
	SESSIONDATA* pSessionData = (SESSIONDATA*)pUser;

	switch (eReason) {
	case LWS_CALLBACK_ESTABLISHED:       // 当服务器和客户端完成握手后
		lwsl_notice("LWS_CALLBACK_ESTABLISHED\n");
		//在此存入客户端的socket
		break;

	case LWS_CALLBACK_RECEIVE:           // 当接收到客户端发来的帧以后
		lwsl_notice("LWS_CALLBACK_RECEIVE\n");
		// 判断是否最后一帧
		pSessionData->bIsFin = (lws_is_final_fragment(pWSI) != 0);
		// 判断是否二进制消息
		pSessionData->bIsBinary = (lws_frame_is_binary(pWSI) != 0);
		// 对服务器的接收端进行流量控制，如果来不及处理，可以控制之
		// 下面的调用禁止在此连接上接收数据
		//lws_rx_flow_control(wsi, 0);
		
		// 业务处理部分，为了实现Echo服务器，把客户端数据保存起来
		memcpy(&pSessionData->szBuffer[LWS_PRE], pInData, iLen);
		pSessionData->iLen= iLen;
		//lwsl_notice("recvied message:%s\n", &data->buf[LWS_PRE]);
		// 需要给客户端应答时，触发一次写回调
		//lws_callback_on_writable(wsi);
		pSessionData = NULL;
		break;

	case LWS_CALLBACK_SERVER_WRITEABLE:   // 当此连接可写时
		lwsl_notice("LWS_CALLBACK_SERVER_WRITEABLE\n");
		if (pSessionData->iLen > 0)
		{
			lws_write(pWSI, &pSessionData->szBuffer[LWS_PRE], pSessionData->iLen, LWS_WRITE_TEXT);
		}
		// 下面的调用允许在此连接上接收数据
		//lws_rx_flow_control(wsi, 1);
		break;
	case LWS_CALLBACK_CLOSED:
		lwsl_notice("LWS_CALLBACK_CLOSED\n");
		break;
	}

	// 回调函数最终要返回0，否则无法创建服务器
	return 0;
}

/**
* 支持的WebSocket子协议数组,子协议即JavaScript客户端WebSocket(url, protocols)第2参数数组的元素
* 你需要为每种协议提供回调函数
* 格式:协议名称，协议回调，接收缓冲区大小
*/
LWS_PROTOCOLS ArrLWSProtocols[] = {
	{"ws", WSProtocolCallback, sizeof(SESSIONDATA), MAX_PAYLOAD_SIZE,},
	{NULL, NULL, 0}// 最后一个元素固定为此格式
};

//初始化服务器
void WebSocketServer::Init()
{
	g_stContextInfo.port = 8000;
	g_stContextInfo.iface = NULL; // 在所有网络接口上监听
	g_stContextInfo.protocols = ArrLWSProtocols;
	g_stContextInfo.gid = -1;
	g_stContextInfo.uid = -1;
	g_stContextInfo.options = LWS_SERVER_OPTION_VALIDATE_UTF8;
}

//设置ssl(不使用ssl则传空，使用则传入证书文件路径)
int WebSocketServer::SetSSL(const char* pCAFilePath, const char* pServerCertFilePath, 
	const char* pServerPrivateKeyFilePath, bool bIsSupportSSL)
{
	if (!bIsSupportSSL)
	{
		g_stContextInfo.ssl_ca_filepath = NULL;
		g_stContextInfo.ssl_cert_filepath = NULL;
		g_stContextInfo.ssl_private_key_filepath = NULL;
	}
	else
	{
		g_stContextInfo.ssl_ca_filepath = pCAFilePath;
		g_stContextInfo.ssl_cert_filepath = pServerCertFilePath;
		g_stContextInfo.ssl_private_key_filepath = pServerPrivateKeyFilePath;
		g_stContextInfo.options |= LWS_SERVER_OPTION_DO_SSL_GLOBAL_INIT;
		//ctx_info.options |= LWS_SERVER_OPTION_REQUIRE_VALID_OPENSSL_CLIENT_CERT;
	}

	return bIsSupportSSL;
}

//创建服务器
int WebSocketServer::Create()
{
	g_pContext = lws_create_context(&g_stContextInfo);
	if (!g_pContext) {
		lwsl_err("lws_server create failed\n");
		return -1;
	}
	return 1;
}

//运行
INT32 WebSocketServer::Run()
{
	return lws_service(g_pContext, 0);
}

//销毁资源
void WebSocketServer::Destroy()
{
	lws_context_destroy(g_pContext);
}

//启动服务器，供外部调用
void WebSocketServer::ServerStart()
{
	Init();
	Create();

	//服务器运行(运行时可设置间隔等待时间，这里为1000，单位为ms)
	INT32 iRet = 0;
	while (iRet >= 0)
	{
		lwsl_notice("run\n");
		iRet = Run();
	}
	Destroy();
}