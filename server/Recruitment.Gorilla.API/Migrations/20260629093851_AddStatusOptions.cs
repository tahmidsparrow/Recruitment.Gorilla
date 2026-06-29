using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class AddStatusOptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StatusOptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatusOptions", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "StatusOptions",
                columns: new[] { "Id", "CreatedAt", "IsActive", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Reject", 1 },
                    { 2, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Call for Interview", 2 },
                    { 3, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Interview Scheduled", 3 },
                    { 4, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Not Available", 4 },
                    { 5, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Technical Assessment", 5 },
                    { 6, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Submission Receieved", 6 },
                    { 7, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Code Review", 7 },
                    { 8, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Interview Completed", 8 },
                    { 9, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Recommended", 9 },
                    { 10, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "No Submission", 10 },
                    { 11, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Not Recommended", 11 },
                    { 12, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Discontinued", 12 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_StatusOptions_Name",
                table: "StatusOptions",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StatusOptions");
        }
    }
}
