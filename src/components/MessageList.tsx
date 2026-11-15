import {
  Box,
  Loader,
  Stack,
  Text,
  Center,
  Group,
  Modal,
  Image,
  Button,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  useEffect,
  useState,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  conversationService,
  ConversationMessage,
} from "../services/conversationService";
import { messageCacheService } from "../services/messageCacheService";
import { useSocketListener } from "../hooks/useSocketListener";
import { loadImageWithAuth } from "../utils/imageLoader";
import {
  applyMessageChanges,
  findDeletedMessageIds,
  newestChangeTime,
} from "../utils/messageSync";
import { CONFIG } from "../config";
import { MessageBubble, MemberDisplay } from "./MessageBubble";
import { MessageContextMenu, MessageMenuState } from "./MessageContextMenu";

export type { MemberDisplay } from "./MessageBubble";

/** Lets the page show a message it just sent, edited or deleted right away */
export interface MessageListHandle {
  upsertMessage: (msg: ConversationMessage) => void;
}

interface MessageListProps {
  conversationId: string;
  conversationType: "direct" | "group";
  /** userId -> display info for every active member (including self) */
  memberMap: Record<string, MemberDisplay>;
  socket: any;
  handleRef?: React.Ref<MessageListHandle>;
  onReply?: (msg: ConversationMessage) => void;
  onEdit?: (msg: ConversationMessage) => void;
  /** Fired after one of our messages is deleted for everyone */
  onMessageDeleted?: (messageId: string) => void;
  onScrollStateChange?: (isScrolledToBottom: boolean) => void;
  /** Fired whenever the loaded message count changes (initial load, new
   * messages, older pages) so the parent can drive UI like the delete-
   * history button without separately polling the cache. */
  onMessageCountChange?: (count: number) => void;
}

// How many changes-feed pages (up to 200 changes each) one sync may read.
// The cursor is saved after every page, so the next sync continues.
const MAX_CHANGE_PAGES_PER_SYNC = 10;

const sortAscending = (messages: ConversationMessage[]) =>
  [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

const mergeMessages = (
  current: ConversationMessage[],
  incoming: ConversationMessage[],
) => {
  const byId = new Map<string, ConversationMessage>();
  for (const msg of current) byId.set(msg._id, msg);
  for (const msg of incoming) byId.set(msg._id, msg);
  return sortAscending([...byId.values()]);
};

const cacheInBackground = (
  conversationId: string,
  messages: ConversationMessage[],
) => {
  messageCacheService
    .cacheMessages(conversationId, messages)
    .catch((error) => console.error("Background cache error:", error));
};

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  (
    {
      conversationId,
      conversationType,
      memberMap,
      socket,
      handleRef,
      onReply,
      onEdit,
      onMessageDeleted,
      onScrollStateChange,
      onMessageCountChange,
    },
    ref,
  ) => {
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    // Always the latest list, so async syncs never work on a stale copy
    const messagesRef = useRef<ConversationMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [messageImageBlobUrls, setMessageImageBlobUrls] = useState<
      Map<string, string>
    >(new Map());
    const [selectedImageBlobUrls, setSelectedImageBlobUrls] = useState<
      string[]
    >([]);
    const [menuState, setMenuState] = useState<MessageMenuState | null>(null);
    const [deleteTarget, setDeleteTarget] =
      useState<ConversationMessage | null>(null);
    const [isDeletingMessage, setIsDeletingMessage] = useState(false);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const currentUserId = localStorage.getItem("userId") || "";
    const internalScrollRef = useRef<HTMLDivElement>(null);
    // Use provided ref or internal ref - always treat as RefObject
    const scrollContainerRef =
      (ref as React.RefObject<HTMLDivElement>) || internalScrollRef;
    const shouldScrollToBottomRef = useRef(true);
    const isLoadingOlderRef = useRef(false);
    // Height captured just before prepending older messages, so the viewport
    // can be kept anchored on the same message after the prepend renders
    const prependScrollHeightRef = useRef<number | null>(null);
    // One changes sync at a time; a request during a run queues one more
    const changesSyncRef = useRef<{ running: boolean; again: boolean }>({
      running: false,
      again: false,
    });
    const highlightTimerRef = useRef<number | null>(null);

    const commitMessages = useCallback(
      (update: (current: ConversationMessage[]) => ConversationMessage[]) => {
        const next = update(messagesRef.current);
        messagesRef.current = next;
        setMessages(next);
      },
      [],
    );

    // Load message images with auth headers
    useEffect(() => {
      const loadMessageImages = async () => {
        const blobUrls = new Map<string, string>();
        const failedImages = new Set<string>();

        for (const msg of messages) {
          if (msg.imageFiles && msg.imageFiles.length > 0) {
            for (const filename of msg.imageFiles) {
              // Skip if already marked as failed
              if (failedImages.has(filename)) {
                continue;
              }

              try {
                const imageUrl = `${CONFIG.apiUrl}/messages/uploads/images/${filename}`;
                const blobUrl = await loadImageWithAuth(imageUrl);
                blobUrls.set(filename, blobUrl);
              } catch (error) {
                console.error(`Failed to load image ${filename}:`, error);
                failedImages.add(filename);
              }
            }
          }
        }

        setMessageImageBlobUrls(blobUrls);
      };

      if (messages.length > 0) {
        loadMessageImages();
      }
    }, [messages]);

    /**
     * Fetch the newest page from the API, merge it into state + cache.
     * Also (re)establishes the pagination cursor for loading older pages,
     * and marks the conversation read server-side.
     */
    const syncNewestPage = useCallback(async () => {
      const { messages: page, nextCursor: cursor } =
        await conversationService.getMessages(conversationId);
      const hasOlder = cursor !== null;
      commitMessages((current) => {
        // Drop anything the server no longer has at all (e.g. an admin
        // purge) before merging, so it disappears from an open chat without
        // a reload. Messages deleted for everyone come back as tombstones.
        const deleted = new Set(findDeletedMessageIds(current, page, hasOlder));
        const kept = deleted.size
          ? current.filter((m) => !deleted.has(m._id))
          : current;
        return mergeMessages(kept, page);
      });
      setNextCursor((current) => current ?? cursor);
      // Cache in the background — don't block the UI
      messageCacheService
        .syncNewestPage(conversationId, page, hasOlder)
        .catch((error) => console.error("Background cache error:", error));
    }, [conversationId, commitMessages]);

    /**
     * Catch up on messages created, edited or deleted since the last sync,
     * including ones older than the newest page, which a refetch misses.
     */
    const runChangesSync = useCallback(async () => {
      let position = await messageCacheService
        .getChangesPosition(conversationId)
        .catch(() => null);

      if (!position) {
        // First visit: the newest page was just loaded fresh, so start
        // from the newest server timestamp it holds
        const since =
          newestChangeTime(messagesRef.current) ?? new Date(0).toISOString();
        await messageCacheService
          .setChangesPosition(conversationId, { since })
          .catch((error) => console.error("Changes position error:", error));
        return;
      }

      for (let page = 0; page < MAX_CHANGE_PAGES_PER_SYNC; page++) {
        const result = await conversationService.getMessageChanges(
          conversationId,
          position,
        );

        if (result.messages.length > 0) {
          let applied: ConversationMessage[] = [];
          commitMessages((current) => {
            const outcome = applyMessageChanges(current, result.messages);
            applied = outcome.applied;
            return outcome.messages;
          });
          if (applied.length > 0) cacheInBackground(conversationId, applied);
        }

        if (result.nextCursor) {
          position = { cursor: result.nextCursor };
          await messageCacheService
            .setChangesPosition(conversationId, position)
            .catch((error) => console.error("Changes position error:", error));
        }
        if (!result.hasMore) break;
      }
    }, [conversationId, commitMessages]);

    const syncChanges = useCallback(async () => {
      const state = changesSyncRef.current;
      if (state.running) {
        state.again = true;
        return;
      }
      state.running = true;
      try {
        do {
          state.again = false;
          await runChangesSync();
        } while (state.again);
      } catch (error) {
        console.error("Failed to sync message changes:", error);
      } finally {
        state.running = false;
      }
    }, [runChangesSync]);

    const loadMessages = useCallback(async () => {
      setIsLoading(true);
      try {
        // Check cache first for an instant display
        const cached = await messageCacheService
          .getCachedMessages(conversationId)
          .catch(() => []);

        if (cached.length > 0) {
          commitMessages(() => sortAscending(cached as ConversationMessage[]));
          shouldScrollToBottomRef.current = true;
          setIsLoading(false);
          console.log(
            `✓ Displayed ${cached.length} cached messages for conversation ${conversationId}`,
          );
        }

        // Always sync the newest page (also marks the conversation read
        // server-side and sets the cursor for pagination)
        await syncNewestPage();
        shouldScrollToBottomRef.current = true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load messages";
        notifications.show({
          title: "Error",
          message,
          color: "red",
        });
      } finally {
        setIsLoading(false);
      }
      // Edits and deletes of cached messages older than the newest page
      await syncChanges();
    }, [conversationId, syncNewestPage, syncChanges, commitMessages]);

    /**
     * Load the next (older) page when the user scrolls to the top
     */
    const loadOlderMessages = useCallback(async () => {
      if (!nextCursor || isLoadingOlderRef.current) return;

      isLoadingOlderRef.current = true;
      setIsLoadingOlder(true);
      try {
        if (scrollContainerRef.current) {
          prependScrollHeightRef.current =
            scrollContainerRef.current.scrollHeight;
        }
        const { messages: page, nextCursor: cursor } =
          await conversationService.getMessages(conversationId, {
            cursor: nextCursor,
          });
        commitMessages((current) => mergeMessages(current, page));
        setNextCursor(cursor);
        cacheInBackground(conversationId, page);
      } catch (error) {
        console.error("Failed to load older messages:", error);
      } finally {
        isLoadingOlderRef.current = false;
        setIsLoadingOlder(false);
      }
    }, [conversationId, nextCursor, scrollContainerRef, commitMessages]);

    useEffect(() => {
      commitMessages(() => []);
      setNextCursor(null);
      setMenuState(null);
      loadMessages();
    }, [conversationId, loadMessages, commitMessages]);

    // Report the loaded message count to the parent (drives the delete-
    // history button) on every change, not just ones the current user caused
    useEffect(() => {
      onMessageCountChange?.(messages.length);
    }, [messages, onMessageCountChange]);

    useEffect(
      () => () => {
        if (highlightTimerRef.current) {
          window.clearTimeout(highlightTimerRef.current);
        }
      },
      [],
    );

    // Keep scroll position stable after prepending older messages, or stick
    // to the bottom for fresh messages
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      if (prependScrollHeightRef.current !== null) {
        const previousHeight = prependScrollHeightRef.current;
        prependScrollHeightRef.current = null;
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop +=
              scrollContainerRef.current.scrollHeight - previousHeight;
          }
        }, 0);
      } else if (shouldScrollToBottomRef.current) {
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop =
              scrollContainerRef.current.scrollHeight;
          }
        }, 0);
      }
    }, [messages, scrollContainerRef]);

    // Show our own send, edit or delete at once. The API skips this tab's
    // socket for it (X-Socket-Id), so no event will follow here.
    const upsertMessage = useCallback(
      (msg: ConversationMessage) => {
        const isNew = !messagesRef.current.some((m) => m._id === msg._id);
        let applied: ConversationMessage[] = [];
        commitMessages((current) => {
          const outcome = applyMessageChanges(current, [msg]);
          applied = outcome.applied;
          return outcome.messages;
        });
        if (isNew) shouldScrollToBottomRef.current = true;
        if (applied.length > 0) cacheInBackground(conversationId, applied);
      },
      [conversationId, commitMessages],
    );

    useImperativeHandle(handleRef, () => ({ upsertMessage }), [upsertMessage]);

    // Handle manual scroll - don't auto-scroll if user scrolled up, and
    // fetch older pages when the user reaches the top
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } =
        scrollContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      shouldScrollToBottomRef.current = isAtBottom;
      onScrollStateChange?.(isAtBottom);
      // The menu is pinned to the mouse position, not the message
      if (menuState) setMenuState(null);

      if (scrollTop < 40 && nextCursor && !isLoadingOlderRef.current) {
        loadOlderMessages();
      }
    };

    // A message in this conversation was created, edited or deleted.
    // Created (or no action, e.g. after an admin purge): refetch the newest
    // page, which also marks it read. Every action: catch up on changes.
    useSocketListener(socket, {
      eventName: "conversation:message",
      onEvent: async (payload?: { conversationId?: string; action?: string }) => {
        if (payload?.conversationId && payload.conversationId !== conversationId) {
          return;
        }
        if (payload?.action !== "edited" && payload?.action !== "deleted") {
          await syncNewestPage();
        }
        await syncChanges();
      },
    });

    // Back after a dropped connection: events may have been missed
    useSocketListener(socket, {
      eventName: "connect",
      onEvent: async () => {
        await syncNewestPage();
        await syncChanges();
      },
    });

    const getSenderName = useCallback(
      (senderId: string | null) => {
        if (!senderId) return "Unknown";
        if (senderId === currentUserId) return "You";
        return memberMap[senderId]?.nickname || "Former member";
      },
      [memberMap, currentUserId],
    );

    const handleContextMenu = useCallback(
      (event: React.MouseEvent, msg: ConversationMessage) => {
        event.preventDefault();
        setMenuState({ message: msg, x: event.clientX, y: event.clientY });
      },
      [],
    );

    const handleOpenImages = useCallback((blobUrls: string[], index: number) => {
      setSelectedImageBlobUrls(blobUrls);
      setCurrentImageIndex(index);
      setImageModalOpen(true);
    }, []);

    const handleQuoteClick = useCallback(
      (messageId: string) => {
        const element = scrollContainerRef.current?.querySelector(
          `[data-message-id="${messageId}"]`,
        );
        if (!element) {
          notifications.show({
            message: "The original message is further up. Scroll up to load it.",
            color: "gray",
          });
          return;
        }
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedId(messageId);
        if (highlightTimerRef.current) {
          window.clearTimeout(highlightTimerRef.current);
        }
        highlightTimerRef.current = window.setTimeout(
          () => setHighlightedId(null),
          1500,
        );
      },
      [scrollContainerRef],
    );

    const handleCopy = async (msg: ConversationMessage) => {
      try {
        await navigator.clipboard.writeText(msg.message ?? "");
        notifications.show({ message: "Copied to clipboard", color: "green" });
      } catch {
        notifications.show({
          title: "Error",
          message: "Could not copy the message",
          color: "red",
        });
      }
    };

    const handleConfirmDelete = async () => {
      if (!deleteTarget) return;
      setIsDeletingMessage(true);
      try {
        const tombstone = await conversationService.deleteMessage(
          conversationId,
          deleteTarget._id,
        );
        upsertMessage(tombstone);
        onMessageDeleted?.(deleteTarget._id);
        setDeleteTarget(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete message";
        notifications.show({ title: "Error", message, color: "red" });
      } finally {
        setIsDeletingMessage(false);
      }
    };

    if (isLoading && messages.length === 0) {
      return (
        <Center h="400px">
          <Loader />
        </Center>
      );
    }

    return (
      <>
        <Box
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "8px",
          }}
        >
          {isLoadingOlder && (
            <Center py="xs">
              <Loader size="sm" />
            </Center>
          )}
          {messages.length === 0 ? (
            <Center h="100%">
              <Text c="dimmed">No messages yet. Start the conversation!</Text>
            </Center>
          ) : (
            messages.map((msg) => {
              const isCurrentUser = msg.senderId === currentUserId;
              return (
                <MessageBubble
                  key={msg._id}
                  msg={msg}
                  isCurrentUser={isCurrentUser}
                  sender={memberMap[msg.senderId]}
                  showSenderName={conversationType === "group" && !isCurrentUser}
                  imageBlobUrls={messageImageBlobUrls}
                  highlighted={highlightedId === msg._id}
                  getSenderName={getSenderName}
                  onOpenImages={handleOpenImages}
                  onContextMenu={handleContextMenu}
                  onQuoteClick={handleQuoteClick}
                />
              );
            })
          )}
        </Box>

        <MessageContextMenu
          state={menuState}
          currentUserId={currentUserId}
          onClose={() => setMenuState(null)}
          onReply={(msg) => onReply?.(msg)}
          onCopy={handleCopy}
          onEdit={(msg) => onEdit?.(msg)}
          onDelete={(msg) => setDeleteTarget(msg)}
        />

        {/* Delete for everyone confirmation */}
        <Modal
          opened={deleteTarget !== null}
          onClose={() => !isDeletingMessage && setDeleteTarget(null)}
          title="Delete message"
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Delete this message for everyone? This cannot be undone.
              {(deleteTarget?.imageFiles?.length ?? 0) > 0 &&
                " Every image in it is deleted too."}
            </Text>
            <Group justify="flex-end" gap="sm">
              <Button
                variant="light"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeletingMessage}
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handleConfirmDelete}
                loading={isDeletingMessage}
              >
                Delete
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Image Modal */}
        <Modal
          opened={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
          size="lg"
          centered
          title=""
        >
          <Stack align="center" gap="md">
            {selectedImageBlobUrls.length > 0 && (
              <>
                <Image
                  src={
                    selectedImageBlobUrls[currentImageIndex] || "about:blank"
                  }
                  alt={`Image ${currentImageIndex + 1}`}
                  fit="contain"
                  height={500}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "about:blank";
                  }}
                />
                {selectedImageBlobUrls.length > 1 && (
                  <Group justify="center" gap="md">
                    <Button
                      variant="light"
                      size="sm"
                      leftSection={<IconChevronLeft size={16} />}
                      onClick={() => {
                        setCurrentImageIndex((prev) =>
                          prev === 0
                            ? selectedImageBlobUrls.length - 1
                            : prev - 1,
                        );
                      }}
                    >
                      Previous
                    </Button>
                    <Text size="sm" c="dimmed">
                      {currentImageIndex + 1} / {selectedImageBlobUrls.length}
                    </Text>
                    <Button
                      variant="light"
                      size="sm"
                      rightSection={<IconChevronRight size={16} />}
                      onClick={() => {
                        setCurrentImageIndex((prev) =>
                          prev === selectedImageBlobUrls.length - 1
                            ? 0
                            : prev + 1,
                        );
                      }}
                    >
                      Next
                    </Button>
                  </Group>
                )}
              </>
            )}
          </Stack>
        </Modal>
      </>
    );
  },
);

MessageList.displayName = "MessageList";

export default MessageList;
