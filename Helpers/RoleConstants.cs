namespace ChatApplication.Helpers
{
    public static class RoleConstants
    {
        public const string Administrator = "Administrator";
        public const string Engineer = "Engineer";
        public const string Manager = "Manager";
        public const string Support = "Support";
        public const string User = "User";

        public static readonly List<string> AllRoles = new List<string>
        {

            Administrator,
            Engineer,
            Manager,
            Support,
            User
        };
    }
}
