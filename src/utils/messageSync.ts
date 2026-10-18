/**
 * Message sync helpers
 *
 * The newest page the API returns is the complete truth for the time span
 * it covers. A message held locally (in state or the IndexedDB cache) that
 * falls inside that span but is missing from the page was deleted on the
 * server, for example by an admin purge, and must be dropped locally too.
 */

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
