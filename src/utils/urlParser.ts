/**
 * URL Parser Utility
 * Detects and parses URLs from text
 */

export interface TextPart {
  type: "text" | "url";
  content: string;
}

/**
 * Parse text and detect URLs
 * Supports http://, https://, www., and URLs without protocol
 */
export const parseUrlsInText = (text: string): TextPart[] => {
  // Regular expression to match URLs
  // Matches: http://, https://, www., and plain URLs like example.com
  const urlRegex =
    /(https?:\/\/[^\s]+|www\.[^\s]+|(?:^|[\s])(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;

  const parts: TextPart[] = [];
  let lastIndex = 0;

  // Find all URL matches
  const matches = Array.from(text.matchAll(urlRegex));

  if (matches.length === 0) {
    // No URLs found, return entire text
    return [{ type: "text", content: text }];
  }

  matches.forEach((match) => {
    // A bare domain match ("example.com") starts with the whitespace before
    // it; that whitespace stays in the text part, so skip past it
    const url = match[0].trim();
    const leading = match[0].length - match[0].trimStart().length;
    const startIndex = match.index! + leading;

    // Add text before URL
    if (startIndex > lastIndex) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex, startIndex),
      });
    }

    // Add URL (getHrefFromUrl adds the scheme when it is rendered)
    parts.push({
      type: "url",
      content: url,
    });

    lastIndex = startIndex + url.length;
  });

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.substring(lastIndex),
    });
  }

  return parts;
};

/**
 * Return the first URL found in a message, if any -- used to decide
 * whether to render a link preview card beneath the message
 */
export const extractFirstUrl = (text: string): string | null => {
  const firstUrlPart = parseUrlsInText(text).find((part) => part.type === "url");
  return firstUrlPart ? getHrefFromUrl(firstUrlPart.content) : null;
};

/**
 * Convert URL to clickable href
 */
export const getHrefFromUrl = (url: string): string => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return "https://" + url;
};
