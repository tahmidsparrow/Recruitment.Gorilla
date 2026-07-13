using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class RoleRecruitersManyToMany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Create the join table first...
            migrationBuilder.CreateTable(
                name: "RoleRecruiters",
                columns: table => new
                {
                    RoleAppliedOptionId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleRecruiters", x => new { x.RoleAppliedOptionId, x.UserId });
                    table.ForeignKey(
                        name: "FK_RoleRecruiters_RoleAppliedOptions_RoleAppliedOptionId",
                        column: x => x.RoleAppliedOptionId,
                        principalTable: "RoleAppliedOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RoleRecruiters_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_RoleRecruiters_UserId",
                table: "RoleRecruiters",
                column: "UserId");

            // 2. ...copy existing single-recruiter assignments into it...
            migrationBuilder.Sql(
                "INSERT INTO RoleRecruiters (RoleAppliedOptionId, UserId) " +
                "SELECT Id, RecruiterUserId FROM RoleAppliedOptions WHERE RecruiterUserId IS NOT NULL;");

            // 3. ...then drop the old single-FK column.
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RoleRecruiters");

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
    }
}
