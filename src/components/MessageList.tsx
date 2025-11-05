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
import { messageService } from "../services/messageService";
import { messageCacheService } from "../services/messageCacheService";
import { useSocketListener } from "../hooks/useSocketListener";
import { getProfileImageUrl } from "../utils/profileImageUtils";
import { loadImageWithAuth } from "../utils/imageLoader";
import { parseUrlsInText, getHrefFromUrl } from "../utils/urlParser";
import { CONFIG } from "../config";

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  image?: string;
  imageFiles?: string[];
  createdAt: string;
  updatedAt?: string;
  readAt?: string;
}

interface MessageListProps {
  friendId: string;
  socket: any;
  userProfileImage: string | null;
  friendProfileImage?: string;
  onScrollStateChange?: (isScrolledToBottom: boolean) => void;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  (
    {
      friendId,
      socket,
      userProfileImage,
      friendProfileImage,
      onScrollStateChange,
    },
    ref
  ) => {
    const { colorScheme } = useMantineColorScheme();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userProfileImageUrl, setUserProfileImageUrl] = useState<
      string | null
    >(null);
    const [friendProfileImageUrl, setFriendProfileImageUrl] = useState<
      string | null
    >(null);
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

    // Fetch profile image URLs once when component mounts
    useEffect(() => {
      const loadProfileImages = async () => {
        try {
          const [userUrl, friendUrl] = await Promise.all([
            userProfileImage ? getProfileImageUrl(userProfileImage) : null,
            friendProfileImage ? getProfileImageUrl(friendProfileImage) : null,
          ]);
          setUserProfileImageUrl(userUrl);
          setFriendProfileImageUrl(friendUrl);
        } catch (error) {
          console.error("Error loading profile images:", error);
        }
      };

      loadProfileImages();
    }, [userProfileImage, friendProfileImage]);

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
                // Show error notification for failed images
                // notifications.show({
                //   title: "Image Load Failed",
                //   message: `Could not load image: ${filename}`,
                //   color: "red",
                //   autoClose: 3000,
                // });
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

    const loadMessages = useCallback(async () => {
      setIsLoading(true);
      try {
        // Cache-first: Get cached messages immediately
        const data = await messageService.getMessagesDelta(friendId);
        const sortedMessages = [...data].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setMessages(sortedMessages);
        shouldScrollToBottomRef.current = true;

        // Show cached count
        if (sortedMessages.length > 0) {
          console.log(
            `✓ Displayed ${sortedMessages.length} cached messages for friend ${friendId}`
          );
        }
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
    }, [friendId]);

    // Listen for cache updates and re-render if new messages synced
    useEffect(() => {
      const checkForUpdates = async () => {
        const updated = await messageCacheService.getCachedMessages(friendId);
        if (updated.length > messages.length) {
          const sortedMessages = [...updated].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          setMessages(sortedMessages);
          console.log(`✓ Re-rendered with ${updated.length} total messages`);
        }
      };

      if (!isLoading) {
        // Check for updates every 500ms while background sync might be happening
        const interval = setInterval(checkForUpdates, 500);
        return () => clearInterval(interval);
      }
    }, [friendId, messages.length, isLoading]);

    useEffect(() => {
      loadMessages();
    }, [friendId, loadMessages]);

    // Scroll to bottom when messages change or component mounts
    useEffect(() => {
      if (shouldScrollToBottomRef.current && scrollContainerRef.current) {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop =
              scrollContainerRef.current.scrollHeight;
          }
        }, 0);
      }
    }, [messages]);

    // Handle manual scroll - don't auto-scroll if user scrolled up
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } =
        scrollContainerRef.current;
      // If user is not at bottom, don't auto-scroll on new messages
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      shouldScrollToBottomRef.current = isAtBottom;
      onScrollStateChange?.(isAtBottom);
    };

    // Listen for new messages via socket
    useSocketListener(socket, {
      eventName: "newMessageSignal",
      onEvent: loadMessages,
    });

    if (isLoading) {
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
          {messages.length === 0 ? (
            <Center h="100%">
              <Text c="dimmed">No messages yet. Start the conversation!</Text>
            </Center>
          ) : (
            messages.map((msg) => {
              const isCurrentUser = msg.senderId === currentUserId;
              const profileImageUrl = isCurrentUser
                ? userProfileImageUrl
                : friendProfileImageUrl;

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
                      alt="Friend"
                      size="md"
                      radius="xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "";
                      }}
                    />
                  )}
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      maxWidth: "70%",
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
                                  <span key={idx} style={{ display: "inline" }}>
                                    {part.content}
                                  </span>
                                );
                              }
                            });
                          })()}
                        </Text>
                      )}
                      {msg.imageFiles && msg.imageFiles.length > 0 && (
                        <SimpleGrid
                          cols={msg.imageFiles.length === 1 ? 1 : 2}
                          spacing="xs"
                          style={{ marginTop: "0.5rem" }}
                        >
                          {msg.imageFiles.map((filename, idx) => {
                            const blobUrl = messageImageBlobUrls.get(filename);
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
                                      (f) => messageImageBlobUrls.get(f) || ""
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
                            "0"
                          );
                          const day = String(date.getDate()).padStart(2, "0");
                          const hours = String(date.getHours()).padStart(
                            2,
                            "0"
                          );
                          const minutes = String(date.getMinutes()).padStart(
                            2,
                            "0"
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
                            : prev - 1
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
                            : prev + 1
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
  }
);

MessageList.displayName = "MessageList";

export default MessageList;
