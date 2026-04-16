using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ChatApplication
{
    [Authorize]
    public class VideoCallHub : Hub
    {
        public async Task CallUser(string targetUserId, string callerName)
        {
            await Clients.User(targetUserId).SendAsync("IncomingCall", Context.UserIdentifier, callerName);
        }

        public async Task SendOffer(string targetUserId, string offer, string callerName)
        {
            await Clients.User(targetUserId).SendAsync("ReceiveOffer", Context.UserIdentifier, offer, callerName);
        }

        public async Task SendAnswer(string targetUserId, string answer)
        {
            await Clients.User(targetUserId).SendAsync("ReceiveAnswer", answer);
        }

        public async Task SendIceCandidate(string targetUserId, string candidate)
        {
            await Clients.User(targetUserId).SendAsync("ReceiveIceCandidate", candidate);
        }

        public async Task EndCall(string targetUserId)
        {
            await Clients.User(targetUserId).SendAsync("CallEnded");
        }

        public async Task RejectCall(string targetUserId)
        {
            await Clients.User(targetUserId).SendAsync("CallRejected");
        }

    }
}
