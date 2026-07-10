using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCandidateRelevantExperience : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // New required field; backfill existing candidates to "0 Years".
            migrationBuilder.AddColumn<string>(
                name: "RelevantExperience",
                table: "Candidates",
                type: "varchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "0 Years")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RelevantExperience",
                table: "Candidates");
        }
    }
}
