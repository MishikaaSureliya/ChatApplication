using System.Collections.Generic;

namespace ChatApplication.DTOs
{
    public class CreateGroupDto
    {
        public string GroupName { get; set; }
        public List<int> UserIds { get; set; }
    }
}
