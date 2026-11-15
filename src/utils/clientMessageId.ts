/**
 * A new clientMessageId for one send. The API accepts 1 to 64 letters,
 * digits, "-" or "_"; a UUID fits. Sending the same id again (a retry)
 * returns the message already stored instead of a duplicate.
 */
export const newClientMessageId = (): string => {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // randomUUID needs a secure context (https or localhost)
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};
