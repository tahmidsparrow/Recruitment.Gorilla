using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.FileProviders;
using Recruitment.Gorilla.API.Data;
using Recruitment.Gorilla.API.Services;

namespace Recruitment.Gorilla.Tests.Infrastructure;

/// <summary>
/// Base for DB-backed service tests. Each test gets a fresh <see cref="AppDbContext"/> wrapped in a
/// transaction that is rolled back on dispose — the migrate-time seed persists, every test's own writes
/// vanish, so tests are isolated and order-independent without re-migrating. All DB test classes join the
/// "mysql" collection, so they run sequentially (no parallel transactions on the shared database).
/// </summary>
[Collection(MySqlCollection.Name)]
public abstract class DbTestBase : IDisposable
{
    protected readonly AppDbContext Db;
    private readonly IDbContextTransaction _tx;

    protected DbTestBase(MySqlDatabaseFixture fixture)
    {
        Db = fixture.NewContext();
        _tx = Db.Database.BeginTransaction();
        Data = new TestData(Db);
    }

    protected TestData Data { get; }

    // Service factories bound to the transactional context.
    protected CandidateService Candidates() => new(Db, new TestWebHostEnvironment());
    protected ConfigurationService Config() => new(Db);
    protected InterviewService Interviews() => new(Db, Candidates());

    public void Dispose()
    {
        _tx.Rollback();
        _tx.Dispose();
        Db.Dispose();
        GC.SuppressFinalize(this);
    }
}

/// <summary>Minimal IWebHostEnvironment for CandidateService (only ContentRootPath is used, for CV file paths).</summary>
internal sealed class TestWebHostEnvironment : IWebHostEnvironment
{
    public string ApplicationName { get; set; } = "Recruitment.Gorilla.Tests";
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    public string ContentRootPath { get; set; } = Path.GetTempPath();
    public string EnvironmentName { get; set; } = "Testing";
    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    public string WebRootPath { get; set; } = Path.GetTempPath();
}
