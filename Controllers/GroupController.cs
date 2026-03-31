using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using ChatApplication.Models;
using ChatApplication.DTOs;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.AspNetCore.SignalR;
using ChatApplication.Hubs;

namespace ChatApplication.Controllers
{
    [Route("api/group")]
    [ApiController]
    [Authorize]
    public class GroupController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public GroupController(ApplicationDbContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // Resolve current user's numeric id from claims (robust to NameIdentifier containing username)
        private int? GetCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(idClaim))
            {
                if (int.TryParse(idClaim, out var id))
                    return id;

                var userByIdClaim = _context.UserRegisters
                    .FirstOrDefault(u => u.Username == idClaim && u.IsDeleted == false);
                if (userByIdClaim != null)
                    return userByIdClaim.UserId;
            }

            var username = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name;
            if (!string.IsNullOrEmpty(username))
            {
                var user = _context.UserRegisters.FirstOrDefault(u => u.Username == username && u.IsDeleted == false);
                if (user != null)
                    return user.UserId;
            }

            return null;
        }

        [HttpPost("create")]
        public IActionResult CreateGroup(CreateGroupDto dto)
        {
            var userIdNullable = GetCurrentUserId();
            if (userIdNullable == null)
                return Unauthorized();

            int userId = userIdNullable.Value;

            Group group = new Group
            {
                GroupName = dto.GroupName,
                CreatedBy = userId,
                CreatedDate = DateTime.Now,
                IsDeleted = false
            };
            _context.Groups.Add(group);
            _context.SaveChanges();

            foreach (var memberId in dto.UserIds)
            {
                _context.GroupMembers.Add(new GroupMember
                {
                    GroupId = group.GroupId,
                    UserId = memberId,
                    IsAdmin = false,
                    CreatedBy = userId,
                    CreatedDate = DateTime.Now,
                    IsDeleted = false
                });
            }

            _context.GroupMembers.Add(new GroupMember
            {
                GroupId = group.GroupId,
                UserId = userId,
                IsAdmin = true,
                CreatedBy = userId,
                CreatedDate = DateTime.Now,
                IsDeleted = false
            });

            _context.SaveChanges();

            // Create System Message
            Message msg = new Message()
            {
                GroupId = group.GroupId,
                MessageText = "You created the group",
                Timestamp = DateTime.Now,
                CreatedDate = DateTime.Now,
                CreatedBy = "System",
                SenderId = userId, // use creator as sender for now to satisfy FK
                IsDeleted = false
            };
            _context.Messages.Add(msg);
            _context.SaveChanges();

            return Ok(group);
        }
        [HttpPost("add-member")]
        public async Task<IActionResult> AddMember(AddMemberDto dto)
        {
            var userIdNullable = GetCurrentUserId();
            if (userIdNullable == null)
                return Unauthorized();

            int userId = userIdNullable.Value;

            GroupMember member = new GroupMember
            {
                GroupId = dto.GroupId,
                UserId = dto.UserId,
                IsAdmin = false,
                CreatedBy = userId,
                CreatedDate = DateTime.Now,
                IsDeleted = false
            };

            _context.GroupMembers.Add(member);
            _context.SaveChanges();

            // Create System message
            var addedUser = _context.UserRegisters.Find(dto.UserId);
            var username = addedUser != null ? addedUser.Username : "User";
            
            Message msg = new Message()
            {
                GroupId = dto.GroupId,
                MessageText = $"{username} joined the group",
                Timestamp = DateTime.Now,
                CreatedDate = DateTime.Now,
                CreatedBy = "System",
                SenderId = userId, // admin who added them
                IsDeleted = false
            };
            _context.Messages.Add(msg);
            _context.SaveChanges();

            await _hubContext.Clients.Group(dto.GroupId.ToString())
                .SendAsync("ReceiveGroupMessage", dto.GroupId, 0, "System", $"{username} joined the group", msg.Timestamp);


            return Ok("Member Added");
        }

        [HttpGet("my-groups")]
        public IActionResult GetMyGroups()
        {
            var userIdNullable = GetCurrentUserId();
            if (userIdNullable == null)
                return Unauthorized();

            int userId = userIdNullable.Value;

            var groups = (from gm in _context.GroupMembers
                          join g in _context.Groups on gm.GroupId equals g.GroupId
                          where gm.UserId == userId && g.IsDeleted == false && gm.IsDeleted == false
                          select new
                          {
                              g.GroupId,
                              g.GroupName,
                              UnreadCount = _context.Notifications.Count(n => n.UserId == userId && n.Message.GroupId == g.GroupId && n.IsRead == false)
                          }).ToList();

            return Ok(groups);
        }

        [HttpGet("members")]
        public IActionResult GetGroupMembers(int groupId)
        {
            var members = (from gm in _context.GroupMembers
                           join u in _context.UserRegisters on gm.UserId equals u.UserId
                           where gm.GroupId == groupId && gm.IsDeleted == false
                           select new
                           {
                               u.UserId,
                               u.Username
                           }).ToList();

            return Ok(members);
        }

        [HttpGet("all")]
        public IActionResult GetAllGroups()
        {
            var userIdNullable = GetCurrentUserId();
            if (userIdNullable == null)
                return Unauthorized();

            int userId = userIdNullable.Value;

            var groups = (from gm in _context.GroupMembers
                          join g in _context.Groups on gm.GroupId equals g.GroupId
                          where gm.UserId == userId && g.IsDeleted == false && gm.IsDeleted == false
                          select new
                          {
                              g.GroupId,
                              g.GroupName
                          }).ToList();

            return Ok(groups);
        }

        [HttpPost("leave")]
        public async Task<IActionResult> LeaveGroup([FromBody] int groupId)
        {
            var userIdNullable = GetCurrentUserId();
            if (userIdNullable == null)
                return Unauthorized();

            int userId = userIdNullable.Value;

            var memberInfo = _context.GroupMembers
                .FirstOrDefault(gm => gm.GroupId == groupId && gm.UserId == userId && gm.IsDeleted == false);

            if (memberInfo != null)
            {
                memberInfo.IsDeleted = true;
                _context.SaveChanges();

                var user = _context.UserRegisters.Find(userId);
                var username = user != null ? user.Username : "User";

                // Insert System Message
                Message msg = new Message()
                {
                    GroupId = groupId,
                    MessageText = $"{username} left the group",
                    Timestamp = DateTime.Now,
                    CreatedDate = DateTime.Now,
                    CreatedBy = "System",
                    SenderId = userId,
                    IsDeleted = false
                };
                _context.Messages.Add(msg);
                _context.SaveChanges();

                await _hubContext.Clients.Group(groupId.ToString())
                    .SendAsync("ReceiveGroupMessage", groupId, 0, "System", $"{username} left the group", msg.Timestamp);

            }

            return Ok(new { message = "Left Group" });
        }
    }
}
