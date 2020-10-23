#include <signal.h>
#include "WebSocketServer.h"

static bool g_bIsRunning = true;
void SigIntHandler(INT32 iSignal)
{
	//数据持久化
	g_bIsRunning = false;
}

int main()
{
	//接收SIGINT(ctrl+c)信号
	signal(SIGINT, SigIntHandler);
	INT32 iRet = 0;

	//创建服务器对象(可以指定端口，这里指定了8000)
	WebSocketServer webSocketServer(8000);
	
	//初始化服务器
	webSocketServer.Init();
	lwsl_notice("port:%d\n", webSocketServer.GetPort());

	//设置ssl（不使用ssl则传空，使用则传入证书文件路径）
	webSocketServer.SetSSL(NULL, NULL, NULL, 0);

	//创建服务器
	webSocketServer.Create();

	//服务器运行（运行时可设置间隔等待时间，这里为1000，单位为ms）
	while (iRet >= 0 && g_bIsRunning)
	{
		lwsl_notice("run\n");
		iRet = webSocketServer.Run(1000);
	}

	//销毁资源
	webSocketServer.Destroy();

	return 0;
}


