using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class RenameViewerRoleToInterviewer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rename the former "Viewer" role to "Interviewer" (data-only; the role set is
            // stored as strings in UserRoles).
            migrationBuilder.Sql("UPDATE `UserRoles` SET `Role` = 'Interviewer' WHERE `Role` = 'Viewer';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE `UserRoles` SET `Role` = 'Viewer' WHERE `Role` = 'Interviewer';");
        }
    }
}
