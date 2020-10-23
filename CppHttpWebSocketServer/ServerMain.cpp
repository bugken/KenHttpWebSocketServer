#include <signal.h>
#include "WebSocketServer.h"

static bool g_bIsRunning = true;
//处理SIGINT(ctrl+c)信号
void SigIntHandler(INT32 iSignal)
{
	//数据持久化
	g_bIsRunning = false;
}

int main()
{
	signal(SIGINT, SigIntHandler);

	WebSocketServer webSocketServer(8000);
	webSocketServer.ServerStart();

	return 0;
}


