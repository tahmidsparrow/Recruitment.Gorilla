using Microsoft.EntityFrameworkCore;
using Recruitment.Gorilla.API.Models;

namespace Recruitment.Gorilla.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<CVFile> CVFiles => Set<CVFile>();
    public DbSet<StatusHistory> StatusHistories => Set<StatusHistory>();

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
            e.HasOne(s => s.Candidate)
             .WithMany(c => c.StatusHistories)
             .HasForeignKey(s => s.CandidateId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
