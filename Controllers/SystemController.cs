using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatApplication.Controllers
{
    [Route("api/System")]
    [ApiController]
    public class SystemController : Controller
    {
        // ADMIN ONLY - Create User
        [Authorize(Roles = "Administrator")]
        [HttpPost("create-user")]
        public IActionResult CreateUser()
        {
            return Ok("User Created by Admin");
        }

        // ADMIN ONLY - Delete User
        [Authorize(Roles = "Administrator")]
        [HttpDelete("delete-user")]
        public IActionResult DeleteUser()
        {
            return Ok("User Deleted by Admin");
        }

        // ADMIN + MANAGER - View Users
        [Authorize(Roles = "Administrator,Manager")]
        [HttpGet("all-users")]
        public IActionResult GetAllUsers()
        {
            return Ok("All Users List");
        }

        // ENGINEER + USER - Send Message
        [Authorize(Roles = "Engineer,User")]
        [HttpPost("send-message")]
        public IActionResult SendMessage()
        {
            return Ok("Message Sent");
        }

        // SUPPORT - Reply Message
        [Authorize(Roles = "Support")]
        [HttpPost("reply-message")]
        public IActionResult ReplyMessage()
        {
            return Ok("Support Replied");
        }

        // ALL LOGGED IN USERS
        [Authorize]
        [HttpGet("chat")]
        public IActionResult Chat()
        {
            return Ok("Chat Access");
        }
    }
}
