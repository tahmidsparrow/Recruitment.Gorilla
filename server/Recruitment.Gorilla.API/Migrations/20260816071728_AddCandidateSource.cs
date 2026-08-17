using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCandidateSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SourceDetail",
                table: "Candidates",
                type: "varchar(300)",
                maxLength: 300,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "SourceOptionId",
                table: "Candidates",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CandidateSourceOptions",
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
                    table.PrimaryKey("PK_CandidateSourceOptions", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "CandidateSourceOptions",
                columns: new[] { "Id", "CreatedAt", "IsActive", "Name", "SortOrder", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Employee referral", 1, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Job board", 2, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "LinkedIn", 3, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 4, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Recruitment agency", 4, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 5, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Careers page", 5, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 6, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Direct sourcing", 6, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 7, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Internal applicant", 7, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 8, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "University or event", 8, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 9, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Other", 9, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_SourceOptionId",
                table: "Candidates",
                column: "SourceOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_CandidateSourceOptions_Name",
                table: "CandidateSourceOptions",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Candidates_CandidateSourceOptions_SourceOptionId",
                table: "Candidates",
                column: "SourceOptionId",
                principalTable: "CandidateSourceOptions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Candidates_CandidateSourceOptions_SourceOptionId",
                table: "Candidates");

            migrationBuilder.DropTable(
                name: "CandidateSourceOptions");

            migrationBuilder.DropIndex(
                name: "IX_Candidates_SourceOptionId",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "SourceDetail",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "SourceOptionId",
                table: "Candidates");
        }
    }
}
