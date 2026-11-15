import { describe, expect, it } from "vitest";
import { extractFirstUrl, getHrefFromUrl, parseUrlsInText } from "./urlParser";

// Joining the parts back together must give the original text, or the
// message is displayed differently from what was sent
const rejoin = (text: string) =>
  parseUrlsInText(text)
    .map((part) => part.content)
    .join("");

describe("parseUrlsInText", () => {
  it("returns plain text as one part", () => {
    expect(parseUrlsInText("hello there")).toEqual([
      { type: "text", content: "hello there" },
    ]);
  });

  it("splits out an https URL", () => {
    expect(parseUrlsInText("see https://example.com/a?b=1 ok")).toEqual([
      { type: "text", content: "see " },
      { type: "url", content: "https://example.com/a?b=1" },
      { type: "text", content: " ok" },
    ]);
  });

  it("detects www. and bare domains", () => {
    const parts = parseUrlsInText("www.example.com and example.org");
    expect(parts.filter((p) => p.type === "url").map((p) => p.content)).toEqual([
      "www.example.com",
      "example.org",
    ]);
  });

  it("keeps the space before a bare domain and its last letter", () => {
    expect(parseUrlsInText("visit example.com now")).toEqual([
      { type: "text", content: "visit " },
      { type: "url", content: "example.com" },
      { type: "text", content: " now" },
    ]);
  });

  it.each([
    "visit example.com now",
    "two links https://a.com and b.org/path end",
    "line one\nexample.com\nline three",
    "https://example.com",
  ])("keeps the text unchanged: %j", (text) => {
    expect(rejoin(text)).toBe(text);
  });
});

describe("getHrefFromUrl", () => {
  it("keeps an existing scheme", () => {
    expect(getHrefFromUrl("http://example.com")).toBe("http://example.com");
  });

  it("adds https to a bare domain", () => {
    expect(getHrefFromUrl("example.com")).toBe("https://example.com");
  });
});

describe("extractFirstUrl", () => {
  it("returns the first URL as a clickable href", () => {
    expect(extractFirstUrl("go to www.example.com then https://b.com")).toBe(
      "https://www.example.com",
    );
  });

  it("returns null when there is no URL", () => {
    expect(extractFirstUrl("no links here")).toBeNull();
  });
});
