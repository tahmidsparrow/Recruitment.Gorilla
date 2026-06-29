using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Models;

namespace Recruitment.Gorilla.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<CVFile> CVFiles => Set<CVFile>();
    public DbSet<StatusHistory> StatusHistories => Set<StatusHistory>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<StatusOption> StatusOptions => Set<StatusOption>();
    public DbSet<StatusTransition> StatusTransitions => Set<StatusTransition>();
    public DbSet<RoleAppliedOption> RoleAppliedOptions => Set<RoleAppliedOption>();
    public DbSet<SkillOption> SkillOptions => Set<SkillOption>();
    public DbSet<CandidateSkill> CandidateSkills => Set<CandidateSkill>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Candidate>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.FullName).HasMaxLength(200).IsRequired();
            e.Property(c => c.Email).HasMaxLength(200).IsRequired();
            e.Property(c => c.Phone).HasMaxLength(50);
            e.Property(c => c.CurrentTitle).HasMaxLength(200);
            e.Property(c => c.LinkedInUrl).HasMaxLength(500);
            e.Property(c => c.GithubUrl).HasMaxLength(500);
            e.Property(c => c.PortfolioUrl).HasMaxLength(500);
            e.Property(c => c.AppliedRole).HasMaxLength(150);
            e.Property(c => c.ReferenceName).HasMaxLength(200);
            e.Property(c => c.ReferenceEmail).HasMaxLength(200);
            e.Property(c => c.ReferenceEmployeeId).HasMaxLength(100);
            e.Property(c => c.CurrentStatus).HasMaxLength(100).IsRequired();
            e.HasOne(c => c.RoleAppliedOption)
             .WithMany()
             .HasForeignKey(c => c.RoleAppliedOptionId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CVFile>(e =>
        {
            e.HasKey(f => f.Id);
            e.Property(f => f.OriginalFileName).HasMaxLength(500).IsRequired();
            e.Property(f => f.StoredFileName).HasMaxLength(500).IsRequired();
            e.Property(f => f.FileType).HasMaxLength(10).IsRequired();
            e.HasOne(f => f.Candidate)
             .WithMany(c => c.CVFiles)
             .HasForeignKey(f => f.CandidateId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StatusHistory>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Status).HasMaxLength(100).IsRequired();
            e.Property(s => s.ChangedBy).HasMaxLength(200).IsRequired();
            e.Property(s => s.TaskDetails).HasMaxLength(1000);
            e.Property(s => s.SubmissionUrl).HasMaxLength(1000);
            e.HasOne(s => s.Candidate)
             .WithMany(c => c.StatusHistories)
             .HasForeignKey(s => s.CandidateId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.TokenHash).HasMaxLength(100).IsRequired();
            e.Property(t => t.Username).HasMaxLength(200).IsRequired();
            e.Property(t => t.ReplacedByTokenHash).HasMaxLength(100);
            e.Ignore(t => t.IsActive);
            e.HasIndex(t => t.TokenHash).IsUnique();
        });

        modelBuilder.Entity<StatusOption>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Name).HasMaxLength(100).IsRequired();
            e.Property(s => s.IsInitial).HasDefaultValue(false);
            e.Property(s => s.IsActive).HasDefaultValue(true);
            e.HasIndex(s => s.Name).IsUnique();

            e.HasData(
                new StatusOption { Id = 1, Name = "Reject", SortOrder = 14, IsInitial = true, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 2, Name = "Call for Interview", SortOrder = 8, IsInitial = false, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 3, Name = "Interview Scheduled", SortOrder = 9, IsInitial = false, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 4, Name = "Not Available", SortOrder = 12, IsInitial = true, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 5, Name = "Technical Assessment", SortOrder = 3, IsInitial = false, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 6, Name = "Submission Receieved", SortOrder = 4, IsInitial = false, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 7, Name = "Code Review", SortOrder = 5, IsInitial = false, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 8, Name = "Interview Completed", SortOrder = 10, IsInitial = false, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 9, Name = "Recommended", SortOrder = 11, IsInitial = false, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 10, Name = "No Submission", SortOrder = 6, IsInitial = false, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 11, Name = "Not Recommended", SortOrder = 13, IsInitial = false, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 12, Name = "Discontinued", SortOrder = 15, IsInitial = true, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 13, Name = "Uploaded", SortOrder = 1, IsInitial = true, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) },
                new StatusOption { Id = 14, Name = "Ask for Assesment", SortOrder = 2, IsInitial = false, IsActive = true, CreatedAt = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc) }
            );
        });

        modelBuilder.Entity<StatusTransition>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.IsActive).HasDefaultValue(true);
            e.HasOne(t => t.FromStatusOption)
             .WithMany()
             .HasForeignKey(t => t.FromStatusOptionId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.ToStatusOption)
             .WithMany()
             .HasForeignKey(t => t.ToStatusOptionId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(t => new { t.FromStatusOptionId, t.ToStatusOptionId }).IsUnique();

            e.HasData(
                new StatusTransition { Id = 1, FromStatusOptionId = 13, ToStatusOptionId = 14, SortOrder = 1, IsActive = true },
                new StatusTransition { Id = 2, FromStatusOptionId = 13, ToStatusOptionId = 4, SortOrder = 2, IsActive = true },
                new StatusTransition { Id = 3, FromStatusOptionId = 13, ToStatusOptionId = 1, SortOrder = 3, IsActive = true },
                new StatusTransition { Id = 4, FromStatusOptionId = 13, ToStatusOptionId = 12, SortOrder = 4, IsActive = true },
                new StatusTransition { Id = 5, FromStatusOptionId = 14, ToStatusOptionId = 5, SortOrder = 1, IsActive = true },
                new StatusTransition { Id = 6, FromStatusOptionId = 14, ToStatusOptionId = 4, SortOrder = 2, IsActive = true },
                new StatusTransition { Id = 7, FromStatusOptionId = 14, ToStatusOptionId = 12, SortOrder = 3, IsActive = true },
                new StatusTransition { Id = 8, FromStatusOptionId = 5, ToStatusOptionId = 6, SortOrder = 1, IsActive = true },
                new StatusTransition { Id = 9, FromStatusOptionId = 5, ToStatusOptionId = 10, SortOrder = 2, IsActive = true },
                new StatusTransition { Id = 10, FromStatusOptionId = 5, ToStatusOptionId = 4, SortOrder = 3, IsActive = true },
                new StatusTransition { Id = 11, FromStatusOptionId = 5, ToStatusOptionId = 12, SortOrder = 4, IsActive = true },
                new StatusTransition { Id = 12, FromStatusOptionId = 6, ToStatusOptionId = 7, SortOrder = 1, IsActive = true },
                new StatusTransition { Id = 13, FromStatusOptionId = 7, ToStatusOptionId = 2, SortOrder = 1, IsActive = true },
                new StatusTransition { Id = 14, FromStatusOptionId = 7, ToStatusOptionId = 11, SortOrder = 2, IsActive = true },
                new StatusTransition { Id = 15, FromStatusOptionId = 7, ToStatusOptionId = 4, SortOrder = 3, IsActive = true },
                new StatusTransition { Id = 16, FromStatusOptionId = 7, ToStatusOptionId = 12, SortOrder = 4, IsActive = true },
                new StatusTransition { Id = 17, FromStatusOptionId = 2, ToStatusOptionId = 3, SortOrder = 1, IsActive = true },
                new StatusTransition { Id = 18, FromStatusOptionId = 2, ToStatusOptionId = 4, SortOrder = 2, IsActive = true },
                new StatusTransition { Id = 19, FromStatusOptionId = 2, ToStatusOptionId = 12, SortOrder = 3, IsActive = true },
                new StatusTransition { Id = 20, FromStatusOptionId = 3, ToStatusOptionId = 8, SortOrder = 1, IsActive = true },
                new StatusTransition { Id = 21, FromStatusOptionId = 3, ToStatusOptionId = 4, SortOrder = 2, IsActive = true },
                new StatusTransition { Id = 22, FromStatusOptionId = 3, ToStatusOptionId = 12, SortOrder = 3, IsActive = true },
                new StatusTransition { Id = 23, FromStatusOptionId = 8, ToStatusOptionId = 9, SortOrder = 1, IsActive = true },
                new StatusTransition { Id = 24, FromStatusOptionId = 8, ToStatusOptionId = 11, SortOrder = 2, IsActive = true },
                new StatusTransition { Id = 25, FromStatusOptionId = 8, ToStatusOptionId = 4, SortOrder = 3, IsActive = true },
                new StatusTransition { Id = 26, FromStatusOptionId = 8, ToStatusOptionId = 12, SortOrder = 4, IsActive = true },
                new StatusTransition { Id = 27, FromStatusOptionId = 9, ToStatusOptionId = 12, SortOrder = 1, IsActive = true },
                new StatusTransition { Id = 28, FromStatusOptionId = 11, ToStatusOptionId = 12, SortOrder = 1, IsActive = true },
                new StatusTransition { Id = 29, FromStatusOptionId = 4, ToStatusOptionId = 12, SortOrder = 1, IsActive = true },
                // Uploaded -> Call for Interview
                new StatusTransition { Id = 30, FromStatusOptionId = 13, ToStatusOptionId = 2, SortOrder = 5, IsActive = true }
            );
        });

        modelBuilder.Entity<RoleAppliedOption>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Name).HasMaxLength(200).IsRequired();
            e.Property(r => r.IsActive).HasDefaultValue(true);
            e.HasIndex(r => r.Name).IsUnique();

            var seeded = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc);
            e.HasData(
                new RoleAppliedOption { Id = 1, Name = "Backend Engineer", SortOrder = 1, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded },
                new RoleAppliedOption { Id = 2, Name = "Frontend Engineer", SortOrder = 2, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded },
                new RoleAppliedOption { Id = 3, Name = "Full Stack Engineer", SortOrder = 3, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded },
                new RoleAppliedOption { Id = 4, Name = "Machine Learning Engineer", SortOrder = 4, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded },
                new RoleAppliedOption { Id = 5, Name = "DevOps Engineer", SortOrder = 5, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded },
                new RoleAppliedOption { Id = 6, Name = "QA Engineer", SortOrder = 6, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded }
            );
        });

        modelBuilder.Entity<SkillOption>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Name).HasMaxLength(200).IsRequired();
            e.Property(s => s.IsActive).HasDefaultValue(true);
            e.HasIndex(s => s.Name).IsUnique();

            var seeded = new DateTime(2026, 06, 29, 0, 0, 0, DateTimeKind.Utc);
            e.HasData(
                new SkillOption { Id = 1, Name = "C#", SortOrder = 1, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded },
                new SkillOption { Id = 2, Name = ".NET", SortOrder = 2, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded },
                new SkillOption { Id = 3, Name = "React", SortOrder = 3, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded },
                new SkillOption { Id = 4, Name = "TypeScript", SortOrder = 4, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded },
                new SkillOption { Id = 5, Name = "SQL", SortOrder = 5, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded },
                new SkillOption { Id = 6, Name = "Python", SortOrder = 6, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded },
                new SkillOption { Id = 7, Name = "AWS", SortOrder = 7, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded },
                new SkillOption { Id = 8, Name = "Docker", SortOrder = 8, IsActive = true, CreatedAt = seeded, UpdatedAt = seeded }
            );
        });

        modelBuilder.Entity<CandidateSkill>(e =>
        {
            e.HasKey(cs => new { cs.CandidateId, cs.SkillOptionId });
            e.HasOne(cs => cs.Candidate)
             .WithMany(c => c.CandidateSkills)
             .HasForeignKey(cs => cs.CandidateId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(cs => cs.SkillOption)
             .WithMany(s => s.CandidateSkills)
             .HasForeignKey(cs => cs.SkillOptionId)
             .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
