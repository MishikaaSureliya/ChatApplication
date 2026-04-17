using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApplication.Migrations
{
    /// <inheritdoc />
    public partial class AddRoleToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            /*
            migrationBuilder.CreateTable(
                name: "UserRegister",
                ...
            */
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ImageStore");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "Messages");

            migrationBuilder.DropTable(
                name: "UserRegister");
        }
    }
}
