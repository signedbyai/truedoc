import { describe, expect, it } from "vitest";
import { sanitizeUploadFilename, documentKey, keyBelongsTo } from "./upload-key";

describe("sanitizeUploadFilename", () => {
  it("strips path separators so a name can't restructure the key", () => {
    expect(sanitizeUploadFilename("a/b\\c.pdf")).toBe("a_b_c.pdf");
  });

  it("collapses dot-runs and trims so the name can't carry traversal", () => {
    // separators -> "_", then each run of 2+ dots -> a single "."
    expect(sanitizeUploadFilename("  ../../etc.pdf ")).toBe("._._etc.pdf");
    expect(sanitizeUploadFilename("../../etc.pdf")).not.toContain("..");
  });

  it("falls back to a default for an empty name", () => {
    expect(sanitizeUploadFilename("")).toBe("document.pdf");
    expect(sanitizeUploadFilename("   ")).toBe("document.pdf");
  });

  it("caps very long names", () => {
    expect(sanitizeUploadFilename("x".repeat(500)).length).toBe(200);
  });
});

describe("documentKey", () => {
  it("builds <orgId>/<documentId>/<sanitized filename>", () => {
    expect(documentKey("org1", "doc1", "My Contract.pdf")).toBe("org1/doc1/My Contract.pdf");
    expect(documentKey("org1", "doc1", "sub/dir/x.pdf")).toBe("org1/doc1/sub_dir_x.pdf");
  });
});

describe("keyBelongsTo", () => {
  it("accepts a key under the exact org/doc prefix", () => {
    expect(keyBelongsTo("org1", "doc1", "org1/doc1/file.pdf")).toBe(true);
  });

  it("rejects a different org or document prefix", () => {
    expect(keyBelongsTo("org1", "doc1", "org2/doc1/file.pdf")).toBe(false);
    expect(keyBelongsTo("org1", "doc1", "org1/doc2/file.pdf")).toBe(false);
  });

  it("rejects traversal and the bare prefix with no filename", () => {
    expect(keyBelongsTo("org1", "doc1", "org1/doc1/../secret")).toBe(false);
    expect(keyBelongsTo("org1", "doc1", "org1/doc1/")).toBe(false);
  });

  it("rejects empty inputs", () => {
    expect(keyBelongsTo("", "doc1", "org1/doc1/f.pdf")).toBe(false);
    expect(keyBelongsTo("org1", "doc1", "")).toBe(false);
  });
});
