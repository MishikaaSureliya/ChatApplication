using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApplication.Migrations
{
    /// <inheritdoc />
    public partial class FixMessageTableForCalls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Messages]') AND name = N'UserId')
                AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Messages]') AND name = N'SenderId')
                BEGIN
                    EXEC sp_rename 'Messages.UserId', 'SenderId', 'COLUMN';
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Messages]') AND name = N'CallDuration')
                BEGIN
                    ALTER TABLE [Messages] ADD [CallDuration] [int] NULL;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Messages]') AND name = N'MessageType')
                BEGIN
                    ALTER TABLE [Messages] ADD [MessageType] [nvarchar](max) NULL;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Messages]') AND name = N'IsSeen')
                BEGIN
                    ALTER TABLE [Messages] ADD [IsSeen] [bit] NOT NULL DEFAULT 0;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Messages_Receiver",
                table: "Messages");

            migrationBuilder.DropForeignKey(
                name: "FK_Messages_Sender",
                table: "Messages");

            migrationBuilder.DropTable(
                name: "GroupMembers");

            migrationBuilder.DropTable(
                name: "Groups");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Messages",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "CallDuration",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "IsSeen",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "MessageType",
                table: "Messages");

            migrationBuilder.RenameColumn(
                name: "SenderId",
                table: "Messages",
                newName: "UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Messages_SenderId",
                table: "Messages",
                newName: "IX_Messages_UserId");

            migrationBuilder.AlterColumn<bool>(
                name: "IsOnline",
                table: "UserRegister",
                type: "bit",
                nullable: true,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<bool>(
                name: "IsDeleted",
                table: "UserRegister",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldNullable: true,
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedDate",
                table: "Messages",
                type: "datetime",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "UpdatedBy",
                table: "Messages",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsGroup",
                table: "Messages",
                type: "bit",
                nullable: true,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPrivate",
                table: "Messages",
                type: "bit",
                nullable: true,
                defaultValue: false);

            migrationBuilder.AddPrimaryKey(
                name: "PK__Messages__C87C0C9CD09D2C9F",
                table: "Messages",
                column: "MessageId");

            migrationBuilder.AddForeignKey(
                name: "FK__Messages__Receiv__3F466844",
                table: "Messages",
                column: "ReceiverId",
                principalTable: "UserRegister",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK__Messages__UserId__3E52440B",
                table: "Messages",
                column: "UserId",
                principalTable: "UserRegister",
                principalColumn: "UserId");
        }
    }
}
