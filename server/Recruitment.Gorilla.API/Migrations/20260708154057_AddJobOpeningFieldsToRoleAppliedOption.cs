using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class AddJobOpeningFieldsToRoleAppliedOption : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "RoleAppliedOptions",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "RoleAppliedOptions",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "PostedDate",
                table: "RoleAppliedOptions",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "RoleAppliedOptions",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Department", "Location", "PostedDate", "Priority" },
                values: new object[] { null, null, null, null });

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Department", "Location", "PostedDate", "Priority" },
                values: new object[] { null, null, null, null });

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Department", "Location", "PostedDate", "Priority" },
                values: new object[] { null, null, null, null });

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Department", "Location", "PostedDate", "Priority" },
                values: new object[] { null, null, null, null });

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "Department", "Location", "PostedDate", "Priority" },
                values: new object[] { null, null, null, null });

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "Department", "Location", "PostedDate", "Priority" },
                values: new object[] { null, null, null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Department",
                table: "RoleAppliedOptions");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "RoleAppliedOptions");

            migrationBuilder.DropColumn(
                name: "PostedDate",
                table: "RoleAppliedOptions");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "RoleAppliedOptions");
        }
    }
}
