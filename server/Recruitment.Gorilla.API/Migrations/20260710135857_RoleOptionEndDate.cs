using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class RoleOptionEndDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PostedDate",
                table: "RoleAppliedOptions");

            // Add nullable, backfill existing rows to CreatedAt + 30 days, then make it required.
            migrationBuilder.AddColumn<DateTime>(
                name: "EndDate",
                table: "RoleAppliedOptions",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE `RoleAppliedOptions` SET `EndDate` = DATE_ADD(`CreatedAt`, INTERVAL 30 DAY) WHERE `EndDate` IS NULL;");

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 1,
                column: "EndDate",
                value: new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 2,
                column: "EndDate",
                value: new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 3,
                column: "EndDate",
                value: new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 4,
                column: "EndDate",
                value: new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 5,
                column: "EndDate",
                value: new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 6,
                column: "EndDate",
                value: new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc));

            // All rows now have a value → enforce NOT NULL to match the model.
            migrationBuilder.AlterColumn<DateTime>(
                name: "EndDate",
                table: "RoleAppliedOptions",
                type: "datetime(6)",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime(6)",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EndDate",
                table: "RoleAppliedOptions");

            migrationBuilder.AddColumn<DateTime>(
                name: "PostedDate",
                table: "RoleAppliedOptions",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 1,
                column: "PostedDate",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 2,
                column: "PostedDate",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 3,
                column: "PostedDate",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 4,
                column: "PostedDate",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 5,
                column: "PostedDate",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 6,
                column: "PostedDate",
                value: null);
        }
    }
}
