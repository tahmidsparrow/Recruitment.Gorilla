using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class AddStatusWorkflowRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsInitial",
                table: "StatusOptions",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "InterviewAt",
                table: "StatusHistories",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubmissionUrl",
                table: "StatusHistories",
                type: "varchar(1000)",
                maxLength: 1000,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "TaskDetails",
                table: "StatusHistories",
                type: "varchar(1000)",
                maxLength: 1000,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "StatusTransitions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    FromStatusOptionId = table.Column<int>(type: "int", nullable: false),
                    ToStatusOptionId = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatusTransitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StatusTransitions_StatusOptions_FromStatusOptionId",
                        column: x => x.FromStatusOptionId,
                        principalTable: "StatusOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StatusTransitions_StatusOptions_ToStatusOptionId",
                        column: x => x.ToStatusOptionId,
                        principalTable: "StatusOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "IsInitial", "SortOrder" },
                values: new object[] { true, 14 });

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 2,
                column: "SortOrder",
                value: 8);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 3,
                column: "SortOrder",
                value: 9);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "IsInitial", "SortOrder" },
                values: new object[] { true, 12 });

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 5,
                column: "SortOrder",
                value: 3);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 6,
                column: "SortOrder",
                value: 4);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 7,
                column: "SortOrder",
                value: 5);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 8,
                column: "SortOrder",
                value: 10);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 9,
                column: "SortOrder",
                value: 11);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 10,
                column: "SortOrder",
                value: 6);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 11,
                column: "SortOrder",
                value: 13);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "IsInitial", "SortOrder" },
                values: new object[] { true, 15 });

            migrationBuilder.InsertData(
                table: "StatusOptions",
                columns: new[] { "Id", "CreatedAt", "IsActive", "IsInitial", "Name", "SortOrder" },
                values: new object[] { 13, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, true, "Uploaded", 1 });

            migrationBuilder.InsertData(
                table: "StatusOptions",
                columns: new[] { "Id", "CreatedAt", "IsActive", "Name", "SortOrder" },
                values: new object[] { 14, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), true, "Ask for Assesment", 2 });

            migrationBuilder.InsertData(
                table: "StatusTransitions",
                columns: new[] { "Id", "FromStatusOptionId", "IsActive", "SortOrder", "ToStatusOptionId" },
                values: new object[,]
                {
                    { 8, 5, true, 1, 6 },
                    { 9, 5, true, 2, 10 },
                    { 10, 5, true, 3, 4 },
                    { 11, 5, true, 4, 12 },
                    { 12, 6, true, 1, 7 },
                    { 13, 7, true, 1, 2 },
                    { 14, 7, true, 2, 11 },
                    { 15, 7, true, 3, 4 },
                    { 16, 7, true, 4, 12 },
                    { 17, 2, true, 1, 3 },
                    { 18, 2, true, 2, 4 },
                    { 19, 2, true, 3, 12 },
                    { 20, 3, true, 1, 8 },
                    { 21, 3, true, 2, 4 },
                    { 22, 3, true, 3, 12 },
                    { 23, 8, true, 1, 9 },
                    { 24, 8, true, 2, 11 },
                    { 25, 8, true, 3, 4 },
                    { 26, 8, true, 4, 12 },
                    { 27, 9, true, 1, 12 },
                    { 28, 11, true, 1, 12 },
                    { 29, 4, true, 1, 12 },
                    { 1, 13, true, 1, 14 },
                    { 2, 13, true, 2, 4 },
                    { 3, 13, true, 3, 1 },
                    { 4, 13, true, 4, 12 },
                    { 5, 14, true, 1, 5 },
                    { 6, 14, true, 2, 4 },
                    { 7, 14, true, 3, 12 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_StatusTransitions_FromStatusOptionId_ToStatusOptionId",
                table: "StatusTransitions",
                columns: new[] { "FromStatusOptionId", "ToStatusOptionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StatusTransitions_ToStatusOptionId",
                table: "StatusTransitions",
                column: "ToStatusOptionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StatusTransitions");

            migrationBuilder.DeleteData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DropColumn(
                name: "IsInitial",
                table: "StatusOptions");

            migrationBuilder.DropColumn(
                name: "InterviewAt",
                table: "StatusHistories");

            migrationBuilder.DropColumn(
                name: "SubmissionUrl",
                table: "StatusHistories");

            migrationBuilder.DropColumn(
                name: "TaskDetails",
                table: "StatusHistories");

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 1,
                column: "SortOrder",
                value: 1);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 2,
                column: "SortOrder",
                value: 2);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 3,
                column: "SortOrder",
                value: 3);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 4,
                column: "SortOrder",
                value: 4);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 5,
                column: "SortOrder",
                value: 5);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 6,
                column: "SortOrder",
                value: 6);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 7,
                column: "SortOrder",
                value: 7);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 8,
                column: "SortOrder",
                value: 8);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 9,
                column: "SortOrder",
                value: 9);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 10,
                column: "SortOrder",
                value: 10);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 11,
                column: "SortOrder",
                value: 11);

            migrationBuilder.UpdateData(
                table: "StatusOptions",
                keyColumn: "Id",
                keyValue: 12,
                column: "SortOrder",
                value: 12);
        }
    }
}
