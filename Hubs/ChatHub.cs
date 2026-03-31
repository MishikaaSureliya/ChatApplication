using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using ChatApplication.Models;
using System.Security.Claims;
using System.Linq;
using System;

namespace ChatApplication.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _context;

        public ChatHub(ApplicationDbContext context)
        {
            _context = context;
        }

        // Get current user id
        private int GetCurrentUserId()
        {
            return int.Parse(Context.User.FindFirst(ClaimTypes.NameIdentifier).Value);
        }

        // Get current username
        private string GetCurrentUsername()
        {
            return Context.User.FindFirst(ClaimTypes.Name)?.Value;
        }

        // ================= PRIVATE MESSAGE =================
        public async Task SendPrivateMessage(int receiverId, string message)
        {
            var senderId = GetCurrentUserId();
            var senderName = GetCurrentUsername();

            Message msg = new Message
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                MessageText = message,
                Timestamp = DateTime.Now,
                IsDeleted = false,
                IsSeen = false
            };

            _context.Messages.Add(msg);
            _context.SaveChanges();

            Notification notification = new Notification()
            {
                UserId = receiverId,
                MessageId = msg.MessageId,
                IsRead = false,
                CreatedDate = DateTime.Now,
                CreatedBy = senderId.ToString(),
                IsDeleted = false
            };
            _context.Notifications.Add(notification);
            _context.SaveChanges();

            // Send message to receiver
            await Clients.User(receiverId.ToString())
                .SendAsync("ReceiveMessage", senderId, senderName, message, msg.Timestamp);

            // Send message back to sender (so sender also sees message)
            await Clients.User(senderId.ToString())
                .SendAsync("ReceiveOwnMessage", receiverId, message, msg.Timestamp);

            // Unread notification badge
            await Clients.User(receiverId.ToString())
                .SendAsync("UnreadMessage", senderId);
        }

        // ================= MESSAGE SEEN =================
        public async Task MarkAsSeen(int senderId)
        {
            var currentUserId = int.Parse(Context.User.FindFirst(ClaimTypes.NameIdentifier).Value);

            var messages = _context.Messages
                .Where(m => m.SenderId == senderId && m.ReceiverId == currentUserId && m.IsSeen == false)
                .ToList();

            foreach (var msg in messages)
            {
                msg.IsSeen = true;
            }

            var notifications = _context.Notifications
                .Where(n => n.UserId == currentUserId && n.Message.SenderId == senderId && n.IsRead == false)
                .ToList();

            foreach (var notif in notifications)
            {
                notif.IsRead = true;
            }

            _context.SaveChanges();

            // Notify sender that messages are seen
            await Clients.User(senderId.ToString())
                .SendAsync("MessagesSeen", currentUserId);
        }

        // ================= ONLINE / OFFLINE =================
        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;

            var user = _context.UserRegisters.FirstOrDefault(u => u.UserId.ToString() == userId);
            if (user != null)
            {
                user.IsOnline = true;
                _context.SaveChanges();
            }

            await Clients.All.SendAsync("UserStatusChanged", userId, true);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var userId = Context.UserIdentifier;

            var user = _context.UserRegisters.FirstOrDefault(u => u.UserId.ToString() == userId);
            if (user != null)
            {
                user.IsOnline = false;
                _context.SaveChanges();
            }

            await Clients.All.SendAsync("UserStatusChanged", userId, false);
            await base.OnDisconnectedAsync(exception);
        }

        // ================= TYPING =================
        public async Task Typing(int receiverId)
        {
            var senderId = Context.UserIdentifier;

            await Clients.User(receiverId.ToString())
                .SendAsync("UserTyping", senderId);
        }

        // ================= GROUP =================
        public async Task JoinGroup(string groupId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupId);
        }

        public async Task LeaveGroup(string groupId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupId);
        }

        // ================= GROUP MESSAGE =================
        public async Task SendGroupMessage(int groupId, string message)
        {
            var senderId = GetCurrentUserId();
            var senderName = GetCurrentUsername();

            Message msg = new Message
            {
                SenderId = senderId,
                ReceiverId = null,
                GroupId = groupId,
                MessageText = message,
                Timestamp = DateTime.Now,
                CreatedDate = DateTime.Now,
                CreatedBy = senderId.ToString(),
                IsDeleted = false,
                IsSeen = false
            };

            _context.Messages.Add(msg);
            _context.SaveChanges();

            // Create notifications for all common group members (except sender)
            var memberIds = _context.GroupMembers
                .Where(gm => gm.GroupId == groupId && gm.UserId != senderId && gm.IsDeleted == false)
                .Select(gm => gm.UserId)
                .ToList();

            foreach (var memberId in memberIds)
            {
                Notification notification = new Notification()
                {
                    UserId = memberId,
                    MessageId = msg.MessageId,
                    IsRead = false,
                    CreatedDate = DateTime.Now,
                    CreatedBy = senderId.ToString(),
                    IsDeleted = false
                };
                _context.Notifications.Add(notification);
            }
            _context.SaveChanges();

            await Clients.Group(groupId.ToString())
                .SendAsync("ReceiveGroupMessage", groupId, senderId, senderName, message, msg.Timestamp);


            // Notify members about the unread group message
            foreach (var memberId in memberIds)
            {
                await Clients.User(memberId.ToString())
                    .SendAsync("GroupUnreadMessage", groupId);
            }
        }

        public async Task MarkGroupAsSeen(int groupId)
        {
            var currentUserId = GetCurrentUserId();

            var notifications = _context.Notifications
                .Where(n => n.UserId == currentUserId && n.Message.GroupId == groupId && n.IsRead == false)
                .ToList();

            foreach (var notif in notifications)
            {
                notif.IsRead = true;
            }

            _context.SaveChanges();
        }
    }
}