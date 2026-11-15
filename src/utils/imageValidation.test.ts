import { describe, expect, it } from "vitest";
import { calculateTotalSize, validateImageFiles } from "./imageValidation";

const MB = 1024 * 1024;

// A File whose reported size is `size` without allocating that much memory
const fakeFile = (name: string, type: string, size: number): File => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("validateImageFiles", () => {
  it("accepts allowed image types", () => {
    const files = [
      fakeFile("a.jpg", "image/jpeg", 1 * MB),
      fakeFile("b.png", "image/png", 1 * MB),
      fakeFile("c.gif", "image/gif", 1 * MB),
      fakeFile("d.webp", "image/webp", 1 * MB),
    ];
    expect(validateImageFiles(files)).toEqual({ isValid: true, errors: [] });
  });

  it("rejects an empty selection", () => {
    expect(validateImageFiles([]).isValid).toBe(false);
  });

  it("rejects other file types", () => {
    const result = validateImageFiles([fakeFile("doc.pdf", "application/pdf", 10)]);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("Invalid file type");
  });

  it("rejects files over 30MB and names the real limit", () => {
    const result = validateImageFiles([fakeFile("big.jpg", "image/jpeg", 31 * MB)]);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("exceeds 30MB limit");
  });

  it("allows a file of exactly 30MB", () => {
    expect(validateImageFiles([fakeFile("max.jpg", "image/jpeg", 30 * MB)]).isValid).toBe(true);
  });

  it("rejects more than 10 files", () => {
    const files = Array.from({ length: 11 }, (_, i) =>
      fakeFile(`${i}.jpg`, "image/jpeg", 10),
    );
    const result = validateImageFiles(files);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("Maximum 10 files");
  });
});

describe("calculateTotalSize", () => {
  it("adds sizes and formats them in MB", () => {
    const files = [fakeFile("a.jpg", "image/jpeg", 1.5 * MB), fakeFile("b.jpg", "image/jpeg", 1 * MB)];
    expect(calculateTotalSize(files)).toBe("2.50");
  });
});
