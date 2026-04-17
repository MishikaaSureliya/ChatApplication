using ChatApplication.Models;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using ChatApplication.DTOs;
using Microsoft.AspNetCore.SignalR;
using ChatApplication.Hubs;
using Microsoft.EntityFrameworkCore;

namespace ChatApplication.Controllers
{
    [Route("api/message")]
    [ApiController]
    [Authorize]
    public class MessageController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public MessageController(ApplicationDbContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        private int GetCurrentUserId()
        {
            return int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
        }

        [HttpGet("chat-users")]
        public IActionResult GetChatUsers()
        {
            int currentUserId = GetCurrentUserId();

            var users = _context.UserRegisters
                .Where(u => u.IsDeleted == false && u.UserId != currentUserId)
                .Select(u => new
                {
                    u.UserId,
                    u.Username,
                    u.IsOnline,
                    UnreadCount = _context.Notifications.Count(n => n.UserId == currentUserId && n.Message.SenderId == u.UserId && n.IsRead == false),
                    MissedCallCount = _context.Messages.Count(m => m.ReceiverId == currentUserId && m.SenderId == u.UserId && m.MessageType == "MissedCall" && m.IsSeen == false),
                    LastMessage = _context.Messages
                        .Where(m => (m.SenderId == currentUserId && m.ReceiverId == u.UserId) || (m.SenderId == u.UserId && m.ReceiverId == currentUserId))
                        .OrderByDescending(m => m.Timestamp)
                        .Select(m => m.MessageText)
                        .FirstOrDefault()
                })
                .ToList();

            return Ok(users);
        }

        [HttpPost("send-private")]
        public async Task<IActionResult> SendPrivateMessage([FromBody] SendMessageDto model)
        {
            int senderId = GetCurrentUserId();

            Message message = new Message()
            {
                SenderId = senderId,
                ReceiverId = model.ReceiverId,
                MessageText = model.MessageText,
                Timestamp = DateTime.Now,
                CreatedDate = DateTime.Now,
                CreatedBy = senderId.ToString(),
                IsDeleted = false
            };

            _context.Messages.Add(message);
            _context.SaveChanges();

            Notification notification = new Notification()
            {
                UserId = model.ReceiverId,
                MessageId = message.MessageId,
                IsRead = false,
                CreatedDate = DateTime.Now,
                CreatedBy = senderId.ToString(),
                IsDeleted = false
            };
            _context.Notifications.Add(notification);
            _context.SaveChanges();

            // Send real-time message
            var senderName = User.Identity?.Name ?? "User";

            await _hubContext.Clients.User(model.ReceiverId.ToString())
                .SendAsync("ReceiveMessage", senderId, senderName, model.MessageText, message.Timestamp);

            await _hubContext.Clients.User(senderId.ToString())
                .SendAsync("ReceiveOwnMessage", model.ReceiverId, model.MessageText, message.Timestamp);

            // Notify about unread message
            await _hubContext.Clients.User(model.ReceiverId.ToString())
                .SendAsync("UnreadMessage", senderId);

            return Ok(message);
        }

        [HttpPost("send-group")]
        public async Task<IActionResult> SendGroupMessage([FromBody] SendGroupMessageDto model)
        {
            int senderId = GetCurrentUserId();
            var senderName = User.Identity.Name;

            Message message = new Message()
            {
                SenderId = senderId,
                GroupId = model.GroupId,
                MessageText = model.MessageText,
                Timestamp = DateTime.Now,
                CreatedDate = DateTime.Now,
                CreatedBy = senderId.ToString(),
                IsDeleted = false
            };

            _context.Messages.Add(message);
            _context.SaveChanges();

            var otherMembers = _context.GroupMembers
                .Where(gm => gm.GroupId == model.GroupId && gm.UserId != senderId && gm.IsDeleted == false)
                .Select(gm => gm.UserId)
                .ToList();

            foreach(var memberId in otherMembers)
            {
                Notification notification = new Notification()
                {
                    UserId = memberId,
                    MessageId = message.MessageId,
                    IsRead = false,
                    CreatedDate = DateTime.Now,
                    CreatedBy = senderId.ToString(),
                    IsDeleted = false
                };
                _context.Notifications.Add(notification);
            }
            _context.SaveChanges();

            await _hubContext.Clients.Group(model.GroupId.ToString())
                .SendAsync("ReceiveGroupMessage", model.GroupId, senderId, senderName, model.MessageText, message.Timestamp);

            // Notify members about unread group message
            foreach (var memberId in otherMembers)
            {
                await _hubContext.Clients.User(memberId.ToString())
                    .SendAsync("GroupUnreadMessage", model.GroupId);
            }

            return Ok(message);
        }

        [HttpPost("mark-group-seen/{groupId}")]
        public IActionResult MarkGroupSeen(int groupId)
        {
            var userId = GetCurrentUserId();

            var unreadNotifications = _context.Notifications
                .Where(n => n.UserId == userId && n.Message.GroupId == groupId && n.IsRead == false)
                .ToList();

            foreach(var notif in unreadNotifications)
            {
                notif.IsRead = true;
            }

            _context.SaveChanges();
            return Ok();
        }

        [HttpGet("history/{receiverId}")]
        public IActionResult GetPrivateChatHistory(int receiverId)
        {
            int userId = GetCurrentUserId();

            var messages = _context.Messages
                .Where(m => m.IsDeleted == false &&
                       ((m.SenderId == userId && m.ReceiverId == receiverId) ||
                        (m.SenderId == receiverId && m.ReceiverId == userId)))
                .OrderBy(m => m.Timestamp)
                .Include(m => m.User)
                .Select(m => new
                {
                    m.MessageId,
                    senderId = m.SenderId,
                    receiverId = m.ReceiverId,
                    m.MessageText,
                    m.MessageType,
                    m.Timestamp,
                    senderUsername = m.User.Username
                })
                .ToList();

            return Ok(messages);
        }

        [HttpGet("group/{groupId}/history")]
        public IActionResult GetGroupChatHistory(int groupId)
        {
            var messages = _context.Messages
                .Where(m => m.GroupId == groupId && m.IsDeleted == false)
                .OrderBy(m => m.Timestamp)
                .Include(m => m.User)
                .Select(m => new
                {
                    m.MessageId,
                    senderId = m.SenderId,
                    m.MessageText,
                    m.Timestamp,
                    senderUsername = m.User.Username
                })
                .ToList();

            return Ok(messages);
        }
    }
}