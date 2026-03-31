using System.ComponentModel.DataAnnotations;

namespace ChatApplication.Models
{
    public class UserDto
    {
        [Required]
        [RegularExpression("^[a-zA-Z]+$", ErrorMessage = "Username must contain only letters")]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress(ErrorMessage = "Invalid Email Address")]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string Password { get; set; } = string.Empty;

        [Required]
        [Compare("Password", ErrorMessage = "Password and Confirm Password do not match")]
        public string ConfirmPassword { get; set; } = string.Empty;
   
        public bool? IsOnline { get; set; }
    }
}
