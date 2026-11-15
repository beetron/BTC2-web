/**
 * Message sync helpers
 *
 * The newest page the API returns is the complete truth for the time span
 * it covers. A message held locally (in state or the IndexedDB cache) that
 * falls inside that span but is missing from the page was deleted on the
 * server, for example by an admin purge, and must be dropped locally too.
 *
 * Edits and deletes for everyone are different: a deleted message stays on
 * the server as a tombstone, and the changes feed reports both, including
 * for messages older than the newest page.
 */

import type {
  ConversationMessage,
  ReplyPreview,
} from "../services/conversationService";

interface SyncableMessage {
  _id: string;
  createdAt: string;
}

/**
 * IDs of local messages the server no longer has.
 * @param hasOlder whether the API reported older pages (a nextCursor). When
 *   false the page holds the entire history, so anything missing from it
 *   is gone; when true only messages newer than the page's oldest one can
 *   be judged.
 */
export const findDeletedMessageIds = (
  local: SyncableMessage[],
  newestPage: SyncableMessage[],
  hasOlder: boolean,
): string[] => {
  const pageIds = new Set(newestPage.map((m) => m._id));

  // Strictly newer than the oldest message in the page: a local message
  // sharing that exact timestamp may belong to the next page back, so it
  // is left alone rather than risk dropping a real message.
  const cutoff =
    hasOlder && newestPage.length > 0
      ? Math.min(...newestPage.map((m) => new Date(m.createdAt).getTime()))
      : Number.NEGATIVE_INFINITY;

  return local
    .filter(
      (m) => !pageIds.has(m._id) && new Date(m.createdAt).getTime() > cutoff,
    )
    .map((m) => m._id);
};

/** Same length the API cuts a reply preview to (REPLY_PREVIEW_LENGTH) */
const REPLY_PREVIEW_LENGTH = 200;

// Same rules as the API's replyPreview (btc2-api src/services/messageView.js)
const toReplyPreview = (quoted: ConversationMessage): ReplyPreview => {
  const hasImages = !quoted.deletedAt && (quoted.imageFiles?.length ?? 0) > 0;
  const imagesExpired = hasImages && Boolean(quoted.imagesExpiredAt);
  return {
    _id: quoted._id,
    senderId: quoted.senderId,
    message: quoted.deletedAt
      ? null
      : (quoted.message ?? "").slice(0, REPLY_PREVIEW_LENGTH),
    hasImages,
    imageFile: hasImages && !imagesExpired ? quoted.imageFiles![0] : null,
    imagesExpired,
    deleted: Boolean(quoted.deletedAt),
    unavailable: false,
  };
};

/**
 * Applies messages from the changes feed (or our own send, edit or delete)
 * to the local list.
 *
 * - A message already held locally is replaced.
 * - A message older than everything held locally is skipped: it belongs to
 *   a page that is not loaded, and inserting it would leave a gap. Paging
 *   back loads its current version later anyway.
 * - Replies quoting a changed message get a fresh preview, since the feed
 *   only returns the changed message itself, not the replies to it.
 *
 * Returns the new sorted list and every message that changed (to cache).
 */
export const applyMessageChanges = (
  current: ConversationMessage[],
  changes: ConversationMessage[],
): { messages: ConversationMessage[]; applied: ConversationMessage[] } => {
  const byId = new Map(current.map((m) => [m._id, m]));
  const oldest =
    current.length > 0
      ? Math.min(...current.map((m) => new Date(m.createdAt).getTime()))
      : Number.NEGATIVE_INFINITY;

  const changedById = new Map<string, ConversationMessage>();
  for (const change of changes) {
    const known = byId.has(change._id);
    if (!known && new Date(change.createdAt).getTime() < oldest) continue;
    byId.set(change._id, change);
    changedById.set(change._id, change);
  }

  if (changedById.size === 0) return { messages: current, applied: [] };

  for (const message of byId.values()) {
    const quotedId = message.replyTo?._id;
    if (!quotedId || message.deletedAt) continue;
    const quoted = changedById.get(quotedId);
    if (!quoted || quoted._id === message._id) continue;
    const updated = { ...message, replyTo: toReplyPreview(quoted) };
    byId.set(message._id, updated);
    changedById.set(message._id, updated);
  }

  const messages = [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return { messages, applied: [...changedById.values()] };
};

/**
 * The newest server timestamp among the messages, used as the first `since`
 * for the changes feed. Server times only, so the browser clock never
 * matters. null when there are no messages.
 */
export const newestChangeTime = (
  messages: ConversationMessage[],
): string | null => {
  let newest = Number.NEGATIVE_INFINITY;
  for (const m of messages) {
    const time = new Date(m.updatedAt ?? m.createdAt).getTime();
    if (time > newest) newest = time;
  }
  return Number.isFinite(newest) ? new Date(newest).toISOString() : null;
};
