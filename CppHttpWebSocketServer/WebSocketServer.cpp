#include "WebSocketServer.h"

static LWS_CONTEXT_CREATION_INFO g_stContextInfo = { 0 };
static LWS_CONTEXT* g_pContext = NULL;

//���캯��
WebSocketServer::WebSocketServer(UINT32 uiListenPort)
{
	m_uiPort = uiListenPort;
}

//��������
WebSocketServer::~WebSocketServer()
{
	lwsl_notice("�������\n");
}

//��������
WebSocketServer::WebSocketServer(const WebSocketServer& That)
{
	m_uiPort = That.m_uiPort;
}

//��ȡ�˿ں�
INT32 WebSocketServer::GetPort()
{
	return m_uiPort;
}

//�������ײ�ʵ�ֵĻص�����
static INT32 WSProtocolCallback(LWS* pWSI, ENUM_CALLBACK_REASON eReason,
	void *pUser, void *pInData, size_t iLen)
{
	SESSIONDATA* pSessionData = (SESSIONDATA*)pUser;

	switch (eReason) {
	case LWS_CALLBACK_ESTABLISHED:       // ���������Ϳͻ���������ֺ�
		lwsl_notice("LWS_CALLBACK_ESTABLISHED\n");
		//�ڴ˴���ͻ��˵�socket
		break;

	case LWS_CALLBACK_RECEIVE:           // �����յ��ͻ��˷�����֡�Ժ�
		lwsl_notice("LWS_CALLBACK_RECEIVE\n");
		// �ж��Ƿ����һ֡
		pSessionData->bIsFin = (lws_is_final_fragment(pWSI) != 0);
		// �ж��Ƿ��������Ϣ
		pSessionData->bIsBinary = (lws_frame_is_binary(pWSI) != 0);
		// �Է������Ľ��ն˽����������ƣ�����������������Կ���֮
		// ����ĵ��ý�ֹ�ڴ������Ͻ�������
		//lws_rx_flow_control(wsi, 0);
		
		// ҵ�����֣�Ϊ��ʵ��Echo���������ѿͻ������ݱ�������
		memcpy(&pSessionData->szBuffer[LWS_PRE], pInData, iLen);
		pSessionData->iLen= iLen;
		//lwsl_notice("recvied message:%s\n", &data->buf[LWS_PRE]);
		// ��Ҫ���ͻ���Ӧ��ʱ������һ��д�ص�
		//lws_callback_on_writable(wsi);
		pSessionData = NULL;
		break;

	case LWS_CALLBACK_SERVER_WRITEABLE:   // �������ӿ�дʱ
		lwsl_notice("LWS_CALLBACK_SERVER_WRITEABLE\n");
		if (pSessionData->iLen > 0)
		{
			lws_write(pWSI, &pSessionData->szBuffer[LWS_PRE], pSessionData->iLen, LWS_WRITE_TEXT);
		}
		// ����ĵ��������ڴ������Ͻ�������
		//lws_rx_flow_control(wsi, 1);
		break;
	case LWS_CALLBACK_CLOSED:
		lwsl_notice("LWS_CALLBACK_CLOSED\n");
		break;
	}

	// �ص���������Ҫ����0�������޷�����������
	return 0;
}

/**
* ֧�ֵ�WebSocket��Э������,��Э�鼴JavaScript�ͻ���WebSocket(url, protocols)��2���������Ԫ��
* ����ҪΪÿ��Э���ṩ�ص�����
* ��ʽ:Э�����ƣ�Э��ص������ջ�������С
*/
LWS_PROTOCOLS ArrLWSProtocols[] = {
	{"ws", WSProtocolCallback, sizeof(SESSIONDATA), MAX_PAYLOAD_SIZE,},
	{NULL, NULL, 0}// ���һ��Ԫ�ع̶�Ϊ�˸�ʽ
};

//��ʼ��������
void WebSocketServer::Init()
{
	g_stContextInfo.port = 8000;
	g_stContextInfo.iface = NULL; // ����������ӿ��ϼ���
	g_stContextInfo.protocols = ArrLWSProtocols;
	g_stContextInfo.gid = -1;
	g_stContextInfo.uid = -1;
	g_stContextInfo.options = LWS_SERVER_OPTION_VALIDATE_UTF8;
}

//����ssl(��ʹ��ssl�򴫿գ�ʹ������֤���ļ�·��)
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

//����������
int WebSocketServer::Create()
{
	g_pContext = lws_create_context(&g_stContextInfo);
	if (!g_pContext) {
		lwsl_err("lws_server create failed\n");
		return -1;
	}
	return 1;
}

//����
INT32 WebSocketServer::Run()
{
	return lws_service(g_pContext, 0);
}

//������Դ
void WebSocketServer::Destroy()
{
	lws_context_destroy(g_pContext);
}

//���������������ⲿ����
void WebSocketServer::ServerStart()
{
	Init();
	Create();

	//����������(����ʱ�����ü���ȴ�ʱ�䣬����Ϊ1000����λΪms)
	INT32 iRet = 0;
	while (iRet >= 0)
	{
		lwsl_notice("run\n");
		iRet = Run();
	}
	Destroy();
}