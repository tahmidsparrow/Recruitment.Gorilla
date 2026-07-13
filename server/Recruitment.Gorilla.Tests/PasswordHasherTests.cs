using Recruitment.Gorilla.API.Auth;

namespace Recruitment.Gorilla.Tests;

/// <summary>PBKDF2 hashing — pure, no DB.</summary>
public class PasswordHasherTests
{
    [Fact]
    public void Hash_then_Verify_round_trips()
    {
        var hash = PasswordHasher.Hash("s3cret!");
        Assert.True(PasswordHasher.Verify("s3cret!", hash));
    }

    [Fact]
    public void Verify_rejects_the_wrong_password()
    {
        var hash = PasswordHasher.Hash("s3cret!");
        Assert.False(PasswordHasher.Verify("wrong", hash));
    }

    [Fact]
    public void Verify_returns_false_for_a_malformed_hash()
    {
        Assert.False(PasswordHasher.Verify("x", "not-a-valid-hash"));
        Assert.False(PasswordHasher.Verify("x", ""));
    }

    [Fact]
    public void Hashing_the_same_password_twice_differs_random_salt()
    {
        Assert.NotEqual(PasswordHasher.Hash("same"), PasswordHasher.Hash("same"));
    }
}
