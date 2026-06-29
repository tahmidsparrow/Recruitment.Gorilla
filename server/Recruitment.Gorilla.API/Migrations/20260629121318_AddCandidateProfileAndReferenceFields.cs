using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCandidateProfileAndReferenceFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AppliedRole",
                table: "Candidates",
                type: "varchar(150)",
                maxLength: 150,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "GithubUrl",
                table: "Candidates",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsReferred",
                table: "Candidates",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PortfolioUrl",
                table: "Candidates",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ReferenceEmail",
                table: "Candidates",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ReferenceEmployeeId",
                table: "Candidates",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ReferenceName",
                table: "Candidates",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AppliedRole",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "GithubUrl",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "IsReferred",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "PortfolioUrl",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "ReferenceEmail",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "ReferenceEmployeeId",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "ReferenceName",
                table: "Candidates");
        }
    }
}
