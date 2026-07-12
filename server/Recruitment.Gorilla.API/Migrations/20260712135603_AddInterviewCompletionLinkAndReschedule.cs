using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class AddInterviewCompletionLinkAndReschedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "InterviewId",
                table: "StatusHistories",
                type: "int",
                nullable: true);

            migrationBuilder.InsertData(
                table: "StatusTransitions",
                columns: new[] { "Id", "FromStatusOptionId", "IsActive", "SortOrder", "ToStatusOptionId" },
                values: new object[] { 31, 8, true, 5, 3 });

            migrationBuilder.CreateIndex(
                name: "IX_StatusHistories_InterviewId",
                table: "StatusHistories",
                column: "InterviewId");

            migrationBuilder.AddForeignKey(
                name: "FK_StatusHistories_Interviews_InterviewId",
                table: "StatusHistories",
                column: "InterviewId",
                principalTable: "Interviews",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_StatusHistories_Interviews_InterviewId",
                table: "StatusHistories");

            migrationBuilder.DropIndex(
                name: "IX_StatusHistories_InterviewId",
                table: "StatusHistories");

            migrationBuilder.DeleteData(
                table: "StatusTransitions",
                keyColumn: "Id",
                keyValue: 31);

            migrationBuilder.DropColumn(
                name: "InterviewId",
                table: "StatusHistories");
        }
    }
}
