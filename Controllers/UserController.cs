using Microsoft.AspNetCore.Mvc;
using ChatApplication.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Identity.Client;
using Microsoft.EntityFrameworkCore;
using ChatApplication.DTOs;

namespace ChatApplication.Controllers
{
    [Route("api/user")]
    [ApiController]
    [Authorize]
    public class UserController : Controller
    {
        private readonly ApplicationDbContext _context;
        
        public UserController(ApplicationDbContext context)
        {
            _context = context;
        }
        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.UserRegisters
                .Where(u => u.IsDeleted == false)
                .Select(u => new
                {
                    u.UserId,
                    u.Username,
                    u.Email,
                    IsOnline = u.IsOnline 
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var user = await _context.UserRegisters
                .Where(u => u.UserId == id && u.IsDeleted == false)
                .Select(u => new
                {
                    u.UserId,
                    u.Username,
                    u.Email,
                    IsOnline = u.IsOnline
                })
                .FirstOrDefaultAsync();

            if (user == null)
                return NotFound("User not found");
            return Ok(user);
        }
        [HttpPut("update/{id}")]
        public async Task<IActionResult> UpdateUser(int id, UserDto dto)
        {
            var user = await _context.UserRegisters.FindAsync(id);

            if (user == null )
                return NotFound("User not found");
            if (user.IsDeleted == true)
                return BadRequest("Cannot updated deleted user");

            user.Username = dto.Username;
            user.Email = dto.Email;

            if (!string.IsNullOrEmpty(dto.Password))
            {
                user.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            }
            if (dto.IsOnline.HasValue)
            {
                user.IsOnline = dto.IsOnline.Value;
            }
            await _context.SaveChangesAsync();
            return Ok("User updated successfully");
        }
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.UserRegisters.FindAsync(id);

            if (user == null) 
                return NotFound("User not found");
            if (user.IsDeleted == true)
                return BadRequest("User already deleted");
            user.IsDeleted = true;

            await _context.SaveChangesAsync();

            return Ok("User deleted Successfully");
        } 
    }
}
