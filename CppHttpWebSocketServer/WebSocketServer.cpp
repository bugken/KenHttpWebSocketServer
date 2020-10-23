#include "WebSocketServer.h"

static struct lws_context_creation_info g_stContextInfo = { 0 };
static struct lws_context* g_pContext = NULL;


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
static int protocol_my_callback(struct lws *wsi,
enum lws_callback_reasons reason,
	void *user,
	void *in,
	size_t len)
{
	struct session_data *data = (struct session_data *) user;

	switch (reason) {
	case LWS_CALLBACK_ESTABLISHED:       // ���������Ϳͻ���������ֺ�
		lwsl_notice("LWS_CALLBACK_ESTABLISHED\n");
		//�ڴ˴���ͻ��˵�socket
		break;

	case LWS_CALLBACK_RECEIVE:           // �����յ��ͻ��˷�����֡�Ժ�
		lwsl_notice("LWS_CALLBACK_RECEIVE\n");
		// �ж��Ƿ����һ֡
		data->fin = (lws_is_final_fragment(wsi) != 0);
		// �ж��Ƿ��������Ϣ
		data->bin = (lws_frame_is_binary(wsi) != 0);
		// �Է������Ľ��ն˽����������ƣ�����������������Կ���֮
		// ����ĵ��ý�ֹ�ڴ������Ͻ�������
		//lws_rx_flow_control(wsi, 0);
		
		// ҵ�����֣�Ϊ��ʵ��Echo���������ѿͻ������ݱ�������
		memcpy(&data->buf[LWS_PRE], in, len);
		data->len = len;
		//lwsl_notice("recvied message:%s\n", &data->buf[LWS_PRE]);
		// ��Ҫ���ͻ���Ӧ��ʱ������һ��д�ص�
		//lws_callback_on_writable(wsi);
		data = NULL;
		break;

	case LWS_CALLBACK_SERVER_WRITEABLE:   // �������ӿ�дʱ
		lwsl_notice("LWS_CALLBACK_SERVER_WRITEABLE\n");
		if (data->len > 0)
		{
			lws_write(wsi, &data->buf[LWS_PRE], data->len, LWS_WRITE_TEXT);
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
* ֧�ֵ�WebSocket��Э������
* ��Э�鼴JavaScript�ͻ���WebSocket(url, protocols)��2���������Ԫ��
* ����ҪΪÿ��Э���ṩ�ص�����
*/
struct lws_protocols protocols[] = {
	{
		//Э�����ƣ�Э��ص������ջ�������С
		"ws", protocol_my_callback, sizeof(struct session_data), MAX_PAYLOAD_SIZE,
	},
	{
		NULL, NULL, 0 // ���һ��Ԫ�ع̶�Ϊ�˸�ʽ
	}
};

void WebSocketServer::Init()
{
	g_stContextInfo.port = 8000;
	g_stContextInfo.iface = NULL; // ����������ӿ��ϼ���
	g_stContextInfo.protocols = protocols;
	g_stContextInfo.gid = -1;
	g_stContextInfo.uid = -1;
	g_stContextInfo.options = LWS_SERVER_OPTION_VALIDATE_UTF8;
}

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

int WebSocketServer::Create()
{
	g_pContext = lws_create_context(&g_stContextInfo);
	if (!g_pContext) {
		lwsl_err("lws_server create failed\n");
		return -1;
	}
	return 1;
}

INT32 WebSocketServer::Run(UINT32 uiWaitTimeMs)
{
	return lws_service(g_pContext, uiWaitTimeMs);
}

void WebSocketServer::Destroy()
{
	lws_context_destroy(g_pContext);
}