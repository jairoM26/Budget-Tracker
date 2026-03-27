import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "../../src/utils/encryption";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-encryption-key-at-least-32-characters-long";
});

describe("Encryption utilities", () => {
  it("encrypts and decrypts a string round-trip", () => {
    const plaintext = '{"host":"imap.example.com","password":"secret123"}';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for the same input (random IV)", () => {
    const plaintext = "same input";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);

    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it("encrypted output has three base64 segments separated by colons", () => {
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");

    expect(parts).toHaveLength(3);
    // Each part should be valid base64
    parts.forEach((part) => {
      expect(() => Buffer.from(part, "base64")).not.toThrow();
    });
  });

  it("throws on invalid encrypted data format", () => {
    expect(() => decrypt("not-valid")).toThrow("Invalid encrypted data format");
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("original");
    const parts = encrypted.split(":");
    // Tamper with the ciphertext
    parts[2] = Buffer.from("tampered").toString("base64");
    expect(() => decrypt(parts.join(":"))).toThrow();
  });

  it("handles unicode characters", () => {
    const plaintext = '{"subject":"Notificación de transacción","monto":"$1,500.00"}';
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });
});
