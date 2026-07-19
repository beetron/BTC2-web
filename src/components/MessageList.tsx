import {
  Box,
  Loader,
  Paper,
  Stack,
  Text,
  Center,
  Avatar,
  Group,
  useMantineColorScheme,
  Anchor,
  Modal,
  Image,
  Button,
  SimpleGrid,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEffect, useState, useCallback, useRef, forwardRef } from "react";
import {
  conversationService,
  ConversationMessage,
} from "../services/conversationService";
import { messageCacheService } from "../services/messageCacheService";
import { useSocketListener } from "../hooks/useSocketListener";
import { loadImageWithAuth } from "../utils/imageLoader";
import { parseUrlsInText, getHrefFromUrl, extractFirstUrl } from "../utils/urlParser";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { CONFIG } from "../config";

export interface MemberDisplay {
  nickname: string | null;
  profileImageUrl: string | null;
}

interface MessageListProps {
  conversationId: string;
  conversationType: "direct" | "group";
  /** userId -> display info for every active member (including self) */
  memberMap: Record<string, MemberDisplay>;
  socket: any;
  onScrollStateChange?: (isScrolledToBottom: boolean) => void;
  /** Fired whenever the loaded message count changes (initial load, new
   * messages, older pages) so the parent can drive UI like the delete-
   * history button without separately polling the cache. */
  onMessageCountChange?: (count: number) => void;
}

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

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  (
    {
      conversationId,
      conversationType,
      memberMap,
      socket,
      onScrollStateChange,
      onMessageCountChange,
    },
    ref,
  ) => {
    const { colorScheme } = useMantineColorScheme();
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
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
     * Also (re)establishes the pagination cursor for loading older pages.
     */
    const syncNewestPage = useCallback(async () => {
      const { messages: page, nextCursor: cursor } =
        await conversationService.getMessages(conversationId);
      setMessages((current) => mergeMessages(current, page));
      setNextCursor((current) => current ?? cursor);
      // Cache in the background — don't block the UI
      messageCacheService
        .cacheMessages(conversationId, page as any)
        .catch((error) => console.error("Background cache error:", error));
    }, [conversationId]);

    const loadMessages = useCallback(async () => {
      setIsLoading(true);
      try {
        // Check cache first for an instant display
        const cached = await messageCacheService
          .getCachedMessages(conversationId)
          .catch(() => []);

        if (cached.length > 0) {
          setMessages(sortAscending(cached as ConversationMessage[]));
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
    }, [conversationId, syncNewestPage]);

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
        setMessages((current) => mergeMessages(current, page));
        setNextCursor(cursor);
        messageCacheService
          .cacheMessages(conversationId, page as any)
          .catch((error) => console.error("Background cache error:", error));
      } catch (error) {
        console.error("Failed to load older messages:", error);
      } finally {
        isLoadingOlderRef.current = false;
        setIsLoadingOlder(false);
      }
    }, [conversationId, nextCursor, scrollContainerRef]);

    useEffect(() => {
      setMessages([]);
      setNextCursor(null);
      loadMessages();
    }, [conversationId, loadMessages]);

    // Report the loaded message count to the parent (drives the delete-
    // history button) on every change, not just ones the current user caused
    useEffect(() => {
      onMessageCountChange?.(messages.length);
    }, [messages, onMessageCountChange]);

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

    // Handle manual scroll - don't auto-scroll if user scrolled up, and
    // fetch older pages when the user reaches the top
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } =
        scrollContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      shouldScrollToBottomRef.current = isAtBottom;
      onScrollStateChange?.(isAtBottom);

      if (scrollTop < 40 && nextCursor && !isLoadingOlderRef.current) {
        loadOlderMessages();
      }
    };

    // New group/direct message in any conversation - only sync if it's ours
    useSocketListener(socket, {
      eventName: "conversation:message",
      onEvent: async (payload?: { conversationId?: string }) => {
        if (!payload?.conversationId || payload.conversationId === conversationId) {
          await syncNewestPage();
        }
      },
    });

    // Legacy signal still emitted for direct messages from older clients
    useSocketListener(socket, {
      eventName: "newMessageSignal",
      onEvent: syncNewestPage,
    });

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
              const sender = memberMap[msg.senderId];
              const profileImageUrl = sender?.profileImageUrl || null;
              const showSenderName =
                conversationType === "group" && !isCurrentUser;
              const firstUrl = msg.message ? extractFirstUrl(msg.message) : null;

              return (
                <Group
                  key={msg._id}
                  align="flex-start"
                  justify={isCurrentUser ? "flex-end" : "flex-start"}
                  gap="xs"
                >
                  {!isCurrentUser && (
                    <Avatar
                      src={profileImageUrl || undefined}
                      alt={sender?.nickname || "Member"}
                      size="md"
                      radius="xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "";
                      }}
                    />
                  )}
                  <Stack gap={2} style={{ maxWidth: "70%" }}>
                    {showSenderName && (
                      <Text size="xs" c="dimmed" fw={500} pl={4}>
                        {sender?.nickname || "Former member"}
                      </Text>
                    )}
                    <Paper
                      p="sm"
                      radius="md"
                      style={{
                        backgroundColor: isCurrentUser ? "#387FDF" : "#DEE2E6",
                      }}
                    >
                      <Stack gap="0.25rem">
                        {msg.message && (
                          <Text
                            size="sm"
                            fw={500}
                            c={isCurrentUser ? "white" : "black"}
                            style={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              overflowWrap: "break-word",
                            }}
                            component="div"
                          >
                            {(() => {
                              const parts = parseUrlsInText(msg.message);
                              return parts.map((part, idx) => {
                                if (part.type === "url") {
                                  const href = getHrefFromUrl(part.content);
                                  return (
                                    <Anchor
                                      key={idx}
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      c={
                                        isCurrentUser
                                          ? "rgba(255,255,255,0.9)"
                                          : "#1971C2"
                                      }
                                      fw={500}
                                      underline="always"
                                      style={{
                                        wordBreak: "break-word",
                                        display: "inline",
                                      }}
                                    >
                                      {part.content}
                                    </Anchor>
                                  );
                                } else {
                                  return (
                                    <span
                                      key={idx}
                                      style={{ display: "inline" }}
                                    >
                                      {part.content}
                                    </span>
                                  );
                                }
                              });
                            })()}
                          </Text>
                        )}
                        {firstUrl && <LinkPreviewCard url={firstUrl} />}
                        {msg.imageFiles && msg.imageFiles.length > 0 && (
                          <SimpleGrid
                            cols={msg.imageFiles.length === 1 ? 1 : 2}
                            spacing="xs"
                            style={{ marginTop: "0.5rem" }}
                          >
                            {msg.imageFiles.map((filename, idx) => {
                              const blobUrl =
                                messageImageBlobUrls.get(filename);
                              return (
                                <Box
                                  key={idx}
                                  style={{
                                    cursor: blobUrl ? "pointer" : "default",
                                    borderRadius: "0.25rem",
                                    overflow: "hidden",
                                    maxWidth: "280px",
                                    opacity: blobUrl ? 1 : 0.5,
                                  }}
                                  onClick={() => {
                                    if (!blobUrl) return; // Don't click if not loaded
                                    const blobUrls = msg
                                      .imageFiles!.map(
                                        (f) =>
                                          messageImageBlobUrls.get(f) || "",
                                      )
                                      .filter(Boolean);
                                    setSelectedImageBlobUrls(blobUrls);
                                    setCurrentImageIndex(idx);
                                    setImageModalOpen(true);
                                  }}
                                >
                                  {blobUrl ? (
                                    <Image
                                      src={blobUrl}
                                      alt={`Message image ${idx + 1}`}
                                      height={250}
                                      fit="cover"
                                    />
                                  ) : (
                                    <Box
                                      style={{
                                        height: "250px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background:
                                          colorScheme === "dark"
                                            ? "#373A40"
                                            : "#E9ECEF",
                                        borderRadius: "0.25rem",
                                      }}
                                    >
                                      <div style={{ textAlign: "center" }}>
                                        <div
                                          style={{
                                            width: "40px",
                                            height: "40px",
                                            background:
                                              colorScheme === "dark"
                                                ? "#25262B"
                                                : "#DEE2E6",
                                            borderRadius: "0.5rem",
                                            margin: "0 auto 0.5rem",
                                            animation: "pulse 1.5s infinite",
                                          }}
                                        />
                                        <div
                                          style={{
                                            fontSize: "0.75rem",
                                            color: "#909296",
                                          }}
                                        >
                                          Loading...
                                        </div>
                                      </div>
                                    </Box>
                                  )}
                                </Box>
                              );
                            })}
                          </SimpleGrid>
                        )}
                        <Text
                          size="10px"
                          fw={400}
                          style={{ lineHeight: 1.2, letterSpacing: "0.3px" }}
                          c={
                            isCurrentUser
                              ? "rgba(255,255,255,0.65)"
                              : colorScheme === "dark"
                                ? "rgba(0,0,0,0.55)"
                                : "rgba(0,0,0,0.45)"
                          }
                        >
                          {(() => {
                            const date = new Date(msg.createdAt);
                            const currentYear = new Date().getFullYear();
                            const messageYear = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(
                              2,
                              "0",
                            );
                            const day = String(date.getDate()).padStart(2, "0");
                            const hours = String(date.getHours()).padStart(
                              2,
                              "0",
                            );
                            const minutes = String(date.getMinutes()).padStart(
                              2,
                              "0",
                            );

                            // If message is from current year, omit the year
                            if (messageYear === currentYear) {
                              return `${month}/${day} (${hours}:${minutes})`;
                            } else {
                              const year = String(messageYear).slice(-2);
                              return `${month}/${day}/'${year} (${hours}:${minutes})`;
                            }
                          })()}
                        </Text>
                      </Stack>
                    </Paper>
                  </Stack>
                  {isCurrentUser && (
                    <Avatar
                      src={profileImageUrl || undefined}
                      alt="You"
                      size="md"
                      radius="xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "";
                      }}
                    />
                  )}
                </Group>
              );
            })
          )}
        </Box>

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
