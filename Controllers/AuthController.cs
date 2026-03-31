using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ChatApplication.Models;
using Microsoft.AspNetCore.Authorization;
using ChatApplication.DTOs;


namespace ChatApplication.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public IActionResult Register(UserDto request)
        {
            if(!ModelState.IsValid)
                return BadRequest(ModelState);

            if (request.Password != request.ConfirmPassword)
                return BadRequest("Password and Confirm Password do not match");

            if (!System.Text.RegularExpressions.Regex.IsMatch(request.Password, @"^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$"))
                return BadRequest("Password must contain at least one capital letter, one number, and one special character.");

            if(_context.UserRegisters.Any(x=>x.Username == request.Username))
                return BadRequest("Username already exists");

            if (_context.UserRegisters.Any(x => x.Email == request.Email))
                return BadRequest("Email already exists");

            string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            UserRegister user = new UserRegister
            {
                Username = request.Username,
                Email = request.Email,
                Password = passwordHash,
                CreatedDate = DateTime.Now,
                CreatedBy = request.Username,
                IsOnline = false,
                IsDeleted = false,
                Role = "User"
            };

            _context.UserRegisters.Add(user);
            _context.SaveChanges();

            return Ok("User Registered Successfully");
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            var user = _context.UserRegisters
                .FirstOrDefault(x => x.Username == request.Username && x.IsDeleted == false);

            if (user == null)
                return BadRequest("User not found");

            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
                return BadRequest("Wrong password");

            string token = CreateToken(user);

            // return single set of properties (lowercase) to avoid JSON property name collisions
            return Ok(new
            {
                token = token,
                username = user.Username,
                userId = user.UserId
            });
        }

        private string CreateToken(UserRegister user)
        {
            var claims = new[]
            {
       new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()), // ID
        new Claim(ClaimTypes.Name, user.Username),                    // Username
        new Claim(ClaimTypes.Role, user.Role ?? "User"),
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
    };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(5),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
