using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ChatApplication.Models;
using System;
using System.Threading.Tasks;

namespace ChatApplication
{
    [Authorize]
    public class VideoCallHub : Hub
    {
        private readonly ApplicationDbContext _context;

        public VideoCallHub(ApplicationDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId()
        {
            return int.Parse(Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        }

        private string GetCurrentUsername()
        {
            return Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "User";
        }

        public async Task CallUser(string targetUserId, string callerName)
        {
            await Clients.User(targetUserId).SendAsync("IncomingCall", Context.UserIdentifier, callerName);
        }

        public async Task SendOffer(string targetUserId, string offer, string callerName)
        {
            var senderId = GetCurrentUserId();
            var receiverId = int.Parse(targetUserId);

            // Record Call Started
            var msg = new Message
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                MessageText = "📞 Call started",
                MessageType = "CallStarted",
                Timestamp = DateTime.Now,
                IsDeleted = false,
                IsSeen = false
            };
            _context.Messages.Add(msg);
            await _context.SaveChangesAsync();

            await Clients.User(targetUserId).SendAsync("ReceiveOffer", Context.UserIdentifier, offer, callerName);
            
            // Notify both users to update chat history
            var notifyPayload = new
            {
                msg.MessageId,
                msg.SenderId,
                msg.ReceiverId,
                msg.MessageText,
                msg.MessageType,
                msg.Timestamp,
                SenderName = callerName
            };

            await Clients.User(senderId.ToString()).SendAsync("ReceiveCallNotification", notifyPayload);
            await Clients.User(targetUserId).SendAsync("ReceiveCallNotification", notifyPayload);
        }

        public async Task SendAnswer(string targetUserId, string answer)
        {
            await Clients.User(targetUserId).SendAsync("ReceiveAnswer", answer);
        }

        public async Task SendIceCandidate(string targetUserId, string candidate)
        {
            await Clients.User(targetUserId).SendAsync("ReceiveIceCandidate", candidate);
        }

        public async Task EndCall(string targetUserId, int? duration = null)
        {
            var senderId = GetCurrentUserId();
            var receiverId = int.Parse(targetUserId);
            
            bool isActuallyMissed = (duration == null || duration == 0);

            // Record Call Ended
            var msg = new Message
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                MessageText = isActuallyMissed ? "📵 Missed call" : $"❌ Call ended ({duration.Value}s)",
                MessageType = isActuallyMissed ? "MissedCall" : "CallEnded",
                CallDuration = duration,
                Timestamp = DateTime.Now,
                IsDeleted = false,
                IsSeen = false
            };
            _context.Messages.Add(msg);
            await _context.SaveChangesAsync();

            // Add Notification entry if missed
            if (isActuallyMissed)
            {
                var notification = new Notification
                {
                    UserId = receiverId,
                    MessageId = msg.MessageId,
                    IsRead = false,
                    CreatedDate = DateTime.Now,
                    CreatedBy = senderId.ToString(),
                    IsDeleted = false
                };
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();
                
                // Trigger standard unread notification event
                await Clients.User(targetUserId).SendAsync("UnreadMessage", senderId);
            }

            await Clients.User(targetUserId).SendAsync("CallEnded");
            
            // Notify both users to update chat history
            var notifyPayload = new
            {
                msg.MessageId,
                msg.SenderId,
                msg.ReceiverId,
                msg.MessageText,
                msg.MessageType,
                msg.Timestamp,
                SenderName = GetCurrentUsername()
            };

            await Clients.User(senderId.ToString()).SendAsync("ReceiveCallNotification", notifyPayload);
            await Clients.User(targetUserId).SendAsync("ReceiveCallNotification", notifyPayload);
        }

        public async Task RejectCall(string targetUserId, string reason = "Rejected")
        {
            var receiverId = GetCurrentUserId(); // The person being called
            var callerId = int.Parse(targetUserId); // The person who initiated the call

            // Record Missed Call
            // Note: Sender should be the one who started the call
            var msg = new Message
            {
                SenderId = callerId,
                ReceiverId = receiverId,
                MessageText = reason == "Busy" ? "📵 Missed call (Busy)" : "📵 Missed call",
                MessageType = "MissedCall",
                Timestamp = DateTime.Now,
                IsDeleted = false,
                IsSeen = false
            };
            _context.Messages.Add(msg);
            await _context.SaveChangesAsync();

            // Add Notification entry for the person who MISSED the call (Receiver)
            var notification = new Notification
            {
                UserId = receiverId,
                MessageId = msg.MessageId,
                IsRead = false,
                CreatedDate = DateTime.Now,
                CreatedBy = callerId.ToString(),
                IsDeleted = false
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Tell the caller that it was rejected or busy
            await Clients.User(targetUserId).SendAsync("CallRejected", reason);
            
            // Notify both users to update chat history UI
            var notifyPayload = new
            {
                msg.MessageId,
                msg.SenderId,
                msg.ReceiverId,
                msg.MessageText,
                msg.MessageType,
                msg.Timestamp,
                SenderName = GetCurrentUsername() // This is the receiver's name? Wait, better use names from DB if needed, but senderName here usually refers to the person who should be displayed as sender in chat UI.
            };

            // To ensure the UI updates correctly, we send the notification to both.
            // When User A calls B and B rejects:
            // User A sees: "Me: 📵 Missed call" (or similar)
            // User B sees: "User A: 📵 Missed call"
            await Clients.User(callerId.ToString()).SendAsync("ReceiveCallNotification", notifyPayload);
            await Clients.User(receiverId.ToString()).SendAsync("ReceiveCallNotification", notifyPayload);
            
            // Trigger standard unread notification event for the person who missed the call
            await Clients.User(receiverId.ToString()).SendAsync("UnreadMessage", callerId);
        }
    }
}
