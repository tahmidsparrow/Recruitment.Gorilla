using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class AddIamSubjectToUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "IamSubject",
                table: "Users",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_Users_IamSubject",
                table: "Users",
                column: "IamSubject",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_IamSubject",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IamSubject",
                table: "Users");
        }
    }
}
