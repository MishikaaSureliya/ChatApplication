using Microsoft.AspNetCore.SignalR;

namespace ChatApplication
{
    public class CustomUserIdProvider : IUserIdProvider
    {
        public string GetUserId(HubConnectionContext connection)
        {
            return connection.GetHttpContext().Request.Query["userId"];
        }
    }
}