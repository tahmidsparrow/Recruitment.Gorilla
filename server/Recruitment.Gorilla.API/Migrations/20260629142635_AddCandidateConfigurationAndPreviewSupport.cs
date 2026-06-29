using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCandidateConfigurationAndPreviewSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RoleAppliedOptionId",
                table: "Candidates",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RoleAppliedOptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleAppliedOptions", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "SkillOptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SkillOptions", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "CandidateSkills",
                columns: table => new
                {
                    CandidateId = table.Column<int>(type: "int", nullable: false),
                    SkillOptionId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CandidateSkills", x => new { x.CandidateId, x.SkillOptionId });
                    table.ForeignKey(
                        name: "FK_CandidateSkills_Candidates_CandidateId",
                        column: x => x.CandidateId,
                        principalTable: "Candidates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CandidateSkills_SkillOptions_SkillOptionId",
                        column: x => x.SkillOptionId,
                        principalTable: "SkillOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "RoleAppliedOptions",
                columns: new[] { "Id", "CreatedAt", "IsActive", "Name", "SortOrder", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Backend Engineer", 1, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Frontend Engineer", 2, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Full Stack Engineer", 3, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 4, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Machine Learning Engineer", 4, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 5, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "DevOps Engineer", 5, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 6, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "QA Engineer", 6, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "SkillOptions",
                columns: new[] { "Id", "CreatedAt", "IsActive", "Name", "SortOrder", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "C#", 1, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, ".NET", 2, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "React", 3, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 4, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "TypeScript", 4, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 5, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "SQL", 5, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 6, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Python", 6, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 7, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "AWS", 7, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 8, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Docker", 8, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "StatusTransitions",
                columns: new[] { "Id", "FromStatusOptionId", "IsActive", "SortOrder", "ToStatusOptionId" },
                values: new object[] { 30, 13, true, 5, 2 });

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_RoleAppliedOptionId",
                table: "Candidates",
                column: "RoleAppliedOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_CandidateSkills_SkillOptionId",
                table: "CandidateSkills",
                column: "SkillOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleAppliedOptions_Name",
                table: "RoleAppliedOptions",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SkillOptions_Name",
                table: "SkillOptions",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Candidates_RoleAppliedOptions_RoleAppliedOptionId",
                table: "Candidates",
                column: "RoleAppliedOptionId",
                principalTable: "RoleAppliedOptions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Candidates_RoleAppliedOptions_RoleAppliedOptionId",
                table: "Candidates");

            migrationBuilder.DropTable(
                name: "CandidateSkills");

            migrationBuilder.DropTable(
                name: "RoleAppliedOptions");

            migrationBuilder.DropTable(
                name: "SkillOptions");

            migrationBuilder.DropIndex(
                name: "IX_Candidates_RoleAppliedOptionId",
                table: "Candidates");

            migrationBuilder.DeleteData(
                table: "StatusTransitions",
                keyColumn: "Id",
                keyValue: 30);

            migrationBuilder.DropColumn(
                name: "RoleAppliedOptionId",
                table: "Candidates");
        }
    }
}
