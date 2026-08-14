using System.Security.Cryptography;
using System.Text;

namespace Recruitment.Gorilla.API.Services;

/// <summary>
/// Symmetric encryption for secrets stored at rest (e.g. the SMTP password held in the DB). Uses
/// AES-256-GCM with a key derived (SHA-256) from the configured <c>Encryption:Key</c>, so the key is
/// stable across restarts and containers (unlike a rotating Data Protection key ring) — a value
/// encrypted today stays decryptable as long as the same <c>Encryption:Key</c> is configured.
/// A fresh 12-byte nonce is generated per value; the stored blob is base64(nonce | tag | ciphertext).
/// </summary>
public class SecretProtector
{
    private const int NonceSize = 12; // AesGcm.NonceByteSizes.MaxSize
    private const int TagSize = 16;   // AesGcm.TagByteSizes.MaxSize
    private readonly byte[] _key;

    public SecretProtector(IConfiguration config)
    {
        var raw = config["Encryption:Key"]
            ?? throw new InvalidOperationException(
                "Encryption:Key is not configured. Set it via user secrets " +
                "(dotnet user-secrets set \"Encryption:Key\" \"<32+ char random string>\") or environment variables.");
        // Derive a fixed 32-byte key from any sufficiently-long passphrase (mirrors the Jwt:Key style).
        _key = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
    }

    /// <summary>Encrypts plaintext → base64(nonce | tag | ciphertext).</summary>
    public string Protect(string plaintext)
    {
        var plain = Encoding.UTF8.GetBytes(plaintext);
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var cipher = new byte[plain.Length];
        var tag = new byte[TagSize];

        using var aes = new AesGcm(_key, TagSize);
        aes.Encrypt(nonce, plain, cipher, tag);

        var combined = new byte[NonceSize + TagSize + cipher.Length];
        Buffer.BlockCopy(nonce, 0, combined, 0, NonceSize);
        Buffer.BlockCopy(tag, 0, combined, NonceSize, TagSize);
        Buffer.BlockCopy(cipher, 0, combined, NonceSize + TagSize, cipher.Length);
        return Convert.ToBase64String(combined);
    }

    /// <summary>Reverses <see cref="Protect"/>. Throws if the blob is malformed or the key is wrong.</summary>
    public string Unprotect(string protectedValue)
    {
        var combined = Convert.FromBase64String(protectedValue);
        if (combined.Length < NonceSize + TagSize)
            throw new CryptographicException("Protected value is too short to be valid.");

        var nonce = combined.AsSpan(0, NonceSize);
        var tag = combined.AsSpan(NonceSize, TagSize);
        var cipher = combined.AsSpan(NonceSize + TagSize);
        var plain = new byte[cipher.Length];

        using var aes = new AesGcm(_key, TagSize);
        aes.Decrypt(nonce, cipher, tag, plain);
        return Encoding.UTF8.GetString(plain);
    }
}
