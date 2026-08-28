using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Recruitment.Gorilla.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomizableEvaluationRubrics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EvaluationRubricId",
                table: "RoleAppliedOptions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EvaluationRubrics",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsDefault = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EvaluationRubrics", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "RubricCriteria",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    EvaluationRubricId = table.Column<int>(type: "int", nullable: false),
                    SectionName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Key = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Label = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Hint = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Weight = table.Column<double>(type: "double", nullable: false, defaultValue: 1.0),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RubricCriteria", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RubricCriteria_EvaluationRubrics_EvaluationRubricId",
                        column: x => x.EvaluationRubricId,
                        principalTable: "EvaluationRubrics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "EvaluationRubrics",
                columns: new[] { "Id", "CreatedAt", "Description", "IsActive", "IsDefault", "Name", "UpdatedAt" },
                values: new object[] { 1, new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc), "Default general-purpose evaluation rubric across 4 standard sections.", true, true, "Standard 12-Criterion Rubric", new DateTime(2026, 6, 29, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 1,
                column: "EvaluationRubricId",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 2,
                column: "EvaluationRubricId",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 3,
                column: "EvaluationRubricId",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 4,
                column: "EvaluationRubricId",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 5,
                column: "EvaluationRubricId",
                value: null);

            migrationBuilder.UpdateData(
                table: "RoleAppliedOptions",
                keyColumn: "Id",
                keyValue: 6,
                column: "EvaluationRubricId",
                value: null);

            migrationBuilder.InsertData(
                table: "RubricCriteria",
                columns: new[] { "Id", "EvaluationRubricId", "Hint", "Key", "Label", "SectionName", "SortOrder", "Weight" },
                values: new object[,]
                {
                    { 1, 1, "Does work history align with the JD?", "RelevanceOfExperience", "Relevance of Experience", "Educational & Professional Background", 1, 1.0 },
                    { 2, 1, "History of growth and tenure", "JobStabilityProgression", "Job Stability & Progression", "Educational & Professional Background", 2, 1.0 },
                    { 3, 1, "Degrees, certifications, training", "EducationalBackground", "Educational Background", "Educational & Professional Background", 3, 1.0 },
                    { 4, 1, "Subject matter expertise", "CoreTechnicalCompetency", "Core Technical Competency", "Technical Skills & Job Knowledge", 4, 1.0 },
                    { 5, 1, "Familiarity with the necessary stack", "ToolsSoftwareProficiency", "Tools & Software Proficiency", "Technical Skills & Job Knowledge", 5, 1.0 },
                    { 6, 1, "Ability to troubleshoot and find solutions", "ProblemSolvingSkills", "Problem-Solving Skills", "Technical Skills & Job Knowledge", 6, 1.0 },
                    { 7, 1, "Verbal and written articulation", "CommunicationClarity", "Communication Clarity", "Soft Skills & Communication", 7, 1.0 },
                    { 8, 1, "Understands questions, attentive", "ListeningSkills", "Listening Skills", "Soft Skills & Communication", 8, 1.0 },
                    { 9, 1, "Handling change or ambiguity", "AdaptabilityFlexibility", "Adaptability & Flexibility", "Soft Skills & Communication", 9, 1.0 },
                    { 10, 1, "Alignment with core principles", "AlignmentWithCompanyValues", "Alignment with Company Values", "Cultural Fit & Motivation", 10, 1.0 },
                    { 11, 1, "Interest in the role/company", "MotivationEnthusiasm", "Motivation & Enthusiasm", "Cultural Fit & Motivation", 11, 1.0 },
                    { 12, 1, "Collaborative vs. independent style", "TeamDynamics", "Team Dynamics", "Cultural Fit & Motivation", 12, 1.0 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_RoleAppliedOptions_EvaluationRubricId",
                table: "RoleAppliedOptions",
                column: "EvaluationRubricId");

            migrationBuilder.CreateIndex(
                name: "IX_RubricCriteria_EvaluationRubricId_Key",
                table: "RubricCriteria",
                columns: new[] { "EvaluationRubricId", "Key" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_RoleAppliedOptions_EvaluationRubrics_EvaluationRubricId",
                table: "RoleAppliedOptions",
                column: "EvaluationRubricId",
                principalTable: "EvaluationRubrics",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RoleAppliedOptions_EvaluationRubrics_EvaluationRubricId",
                table: "RoleAppliedOptions");

            migrationBuilder.DropTable(
                name: "RubricCriteria");

            migrationBuilder.DropTable(
                name: "EvaluationRubrics");

            migrationBuilder.DropIndex(
                name: "IX_RoleAppliedOptions_EvaluationRubricId",
                table: "RoleAppliedOptions");

            migrationBuilder.DropColumn(
                name: "EvaluationRubricId",
                table: "RoleAppliedOptions");
        }
    }
}
