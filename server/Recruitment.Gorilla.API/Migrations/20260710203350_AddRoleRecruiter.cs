using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRoleRecruiter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RecruiterUserId",
                table: "RoleAppliedOptions",
                type: "int",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 1,
                column: "RecruiterUserId",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 2,
                column: "RecruiterUserId",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 3,
                column: "RecruiterUserId",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 4,
                column: "RecruiterUserId",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 5,
                column: "RecruiterUserId",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 6,
                column: "RecruiterUserId",
                value: null);

            migrationBuilder.CreateIndex(
                name: "IX_RoleAppliedOptions_RecruiterUserId",
                table: "RoleAppliedOptions",
                column: "RecruiterUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_RoleAppliedOptions_Users_RecruiterUserId",
                table: "RoleAppliedOptions",
                column: "RecruiterUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RoleAppliedOptions_Users_RecruiterUserId",
                table: "RoleAppliedOptions");

            migrationBuilder.DropIndex(
                name: "IX_RoleAppliedOptions_RecruiterUserId",
                table: "RoleAppliedOptions");

            migrationBuilder.DropColumn(
                name: "RecruiterUserId",
                table: "RoleAppliedOptions");
        }
    }
}
