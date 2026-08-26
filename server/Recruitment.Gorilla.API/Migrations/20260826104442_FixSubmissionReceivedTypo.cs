using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class FixSubmissionReceivedTypo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 6,
                column: "Name",
                value: "Submission Received");

            migrationBuilder.Sql("UPDATE Candidates SET CurrentStatus = 'Submission Received' WHERE CurrentStatus = 'Submission Receieved';");
            migrationBuilder.Sql("UPDATE StatusHistories SET Status = 'Submission Received' WHERE Status = 'Submission Receieved';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 6,
                column: "Name",
                value: "Submission Receieved");

            migrationBuilder.Sql("UPDATE Candidates SET CurrentStatus = 'Submission Receieved' WHERE CurrentStatus = 'Submission Received';");
            migrationBuilder.Sql("UPDATE StatusHistories SET Status = 'Submission Receieved' WHERE Status = 'Submission Received';");
        }
    }
}
