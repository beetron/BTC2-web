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
    const url = match[0].trim();
    const startIndex = match.index!;

    // Add text before URL
    if (startIndex > lastIndex) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex, startIndex),
      });
    }

    // Add URL
    let fullUrl = url;
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
      fullUrl = "https://" + fullUrl;
    }

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
 * Convert URL to clickable href
 */
export const getHrefFromUrl = (url: string): string => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return "https://" + url;
};
