using ChatApplication.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatApplication.Controllers
{
    [Route("api/system")]
    [ApiController]
    public class RoleController : Controller
    {
        // Only Admin
        [Authorize(Roles = "Administrator")]
        [HttpGet("admin-dashboard")]
        public IActionResult AdminDashboard()
        {
            return Ok("Admin Dashboard");
        }

        // Admin + Manager
        [Authorize(Roles = "Administrator,Manager")]
        [HttpGet("manage-users")]
        public IActionResult ManageUsers()
        {
            return Ok("User Management Access");
        }

        // Engineer
        [Authorize(Roles = "Engineer")]
        [HttpGet("engineer-work")]
        public IActionResult EngineerWork()
        {
            return Ok("Engineer Work Access");
        }

        // Support
        [Authorize(Roles = "Support")]
        [HttpGet("support-help")]
        public IActionResult SupportHelp()
        {
            return Ok("Support Help Access");
        }

        // All logged-in users
        [Authorize]
        [HttpGet("chat")]
        public IActionResult Chat()
        {
            return Ok("Chat Access");
        }
    }
}
