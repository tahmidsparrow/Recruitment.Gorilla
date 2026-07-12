using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class AddInterviewTypeOptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InterviewTypeOptions",
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
                    table.PrimaryKey("PK_InterviewTypeOptions", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "InterviewTags",
                columns: table => new
                {
                    InterviewId = table.Column<int>(type: "int", nullable: false),
                    InterviewTypeOptionId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterviewTags", x => new { x.InterviewId, x.InterviewTypeOptionId });
                    table.ForeignKey(
                        name: "FK_InterviewTags_InterviewTypeOptions_InterviewTypeOptionId",
                        column: x => x.InterviewTypeOptionId,
                        principalTable: "InterviewTypeOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InterviewTags_Interviews_InterviewId",
                        column: x => x.InterviewId,
                        principalTable: "Interviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "InterviewTypeOptions",
                columns: new[] { "Id", "CreatedAt", "IsActive", "Name", "SortOrder", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Technical", 1, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "HR", 2, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Managerial", 3, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 4, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "1st Level", 4, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 5, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "2nd Level", 5, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 6, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Final Round", 6, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_InterviewTags_InterviewTypeOptionId",
                table: "InterviewTags",
                column: "InterviewTypeOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_InterviewTypeOptions_Name",
                table: "InterviewTypeOptions",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InterviewTags");

            migrationBuilder.DropTable(
                name: "InterviewTypeOptions");
        }
    }
}
