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
            e.Property(c => c.CurrentStatus).HasMaxLength(100).IsRequired();
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
                new StatusTransition { Id = 29, FromStatusOptionId = 4, ToStatusOptionId = 12, SortOrder = 1, IsActive = true }
            );
        });
    }
}
