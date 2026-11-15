/**
 * Message Bubble
 * One message in a thread: avatar, optional sender name, quoted reply,
 * text with links, link preview, images, and the time (the edit time,
 * with "edited", once the message has been edited).
 * A message deleted for everyone renders as a placeholder.
 */

import {
  Anchor,
  Avatar,
  Box,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { IconPhoto, IconPhotoOff } from "@tabler/icons-react";
import { memo } from "react";
import { useMessageImage } from "../hooks/useMessageImage";
import {
  ConversationMessage,
  ReplyPreview,
} from "../services/conversationService";
import {
  parseUrlsInText,
  getHrefFromUrl,
  extractFirstUrl,
} from "../utils/urlParser";
import { LinkPreviewCard } from "./LinkPreviewCard";

export interface MemberDisplay {
  nickname: string | null;
  profileImageUrl: string | null;
}

interface MessageBubbleProps {
  msg: ConversationMessage;
  isCurrentUser: boolean;
  sender?: MemberDisplay;
  showSenderName: boolean;
  /** filename -> blob URL for message images loaded so far */
  imageBlobUrls: Map<string, string>;
  /** Images that could not be loaded (shown as unavailable) */
  failedImageFiles: Set<string>;
  /** Briefly outlined after jumping to it from a quote */
  highlighted: boolean;
  getSenderName: (senderId: string | null) => string;
  onOpenImages: (blobUrls: string[], index: number) => void;
  onContextMenu: (event: React.MouseEvent, msg: ConversationMessage) => void;
  onQuoteClick: (messageId: string) => void;
}

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // If message is from current year, omit the year
  if (date.getFullYear() === new Date().getFullYear()) {
    return `${month}/${day} (${hours}:${minutes})`;
  }
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/'${year} (${hours}:${minutes})`;
};

/** Size of the photo thumbnail next to quoted text, in pixels */
const QUOTE_THUMBNAIL_SIZE = 36;
/** A quote that is only a photo shows it a little larger */
const QUOTE_PHOTO_ONLY_SIZE = 48;

/**
 * Square thumbnail of a quoted photo. Shows a "photo off" icon when the
 * photo expired or could not be loaded.
 */
const QuoteThumbnail: React.FC<{
  imageFile: string | null;
  expired: boolean;
  isCurrentUser: boolean;
  size?: number;
}> = ({ imageFile, expired, isCurrentUser, size = QUOTE_THUMBNAIL_SIZE }) => {
  const { src, failed } = useMessageImage(expired ? null : imageFile);
  const box: React.CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: "4px",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: isCurrentUser ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)",
    color: isCurrentUser ? "white" : "#495057",
  };

  if (src) {
    return (
      <Box style={box}>
        <img
          src={src}
          alt="Quoted photo"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Box>
    );
  }
  return (
    <Box style={box} title={expired || failed ? "Photo expired" : undefined}>
      {(expired || failed) && <IconPhotoOff size={18} />}
    </Box>
  );
};

const QuotedMessage: React.FC<{
  replyTo: ReplyPreview;
  isCurrentUser: boolean;
  getSenderName: (senderId: string | null) => string;
  onClick: (messageId: string) => void;
}> = ({ replyTo, isCurrentUser, getSenderName, onClick }) => {
  const textColor = isCurrentUser ? "white" : "black";
  const clickable = !replyTo.unavailable && !replyTo.deleted;
  const imagesExpired = Boolean(replyTo.imagesExpired);
  // Replies cached before API 2.1.0 have no imageFile: no thumbnail, just
  // the "Photo" label as before
  const showThumbnail =
    clickable && replyTo.hasImages && (Boolean(replyTo.imageFile) || imagesExpired);

  const boxStyle: React.CSSProperties = {
    cursor: clickable ? "pointer" : "default",
    borderLeft: `3px solid ${isCurrentUser ? "rgba(255,255,255,0.7)" : "#868E96"}`,
    background: isCurrentUser ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.07)",
    borderRadius: "4px",
    padding: "4px 8px",
  };

  // A quoted photo without text: the thumbnail says it all, so no sender
  // name and no "Photo" label. Only an expired photo keeps a short note,
  // since there is no picture left to show.
  if (showThumbnail && !replyTo.message) {
    return (
      <Group
        gap="xs"
        wrap="nowrap"
        onClick={() => onClick(replyTo._id)}
        style={{ ...boxStyle, alignSelf: "flex-start" }}
      >
        <QuoteThumbnail
          imageFile={replyTo.imageFile ?? null}
          expired={imagesExpired}
          isCurrentUser={isCurrentUser}
          size={QUOTE_PHOTO_ONLY_SIZE}
        />
        {imagesExpired && (
          <Text size="xs" c={textColor} fs="italic" style={{ opacity: 0.85 }}>
            Photo expired
          </Text>
        )}
      </Group>
    );
  }

  let body: React.ReactNode;
  if (replyTo.unavailable) {
    body = <i>Original message unavailable</i>;
  } else if (replyTo.deleted) {
    body = <i>This message was deleted</i>;
  } else if (replyTo.message) {
    body = replyTo.message;
  } else if (replyTo.hasImages) {
    body = (
      <Group gap={4} component="span" wrap="nowrap">
        {imagesExpired ? <IconPhotoOff size={14} /> : <IconPhoto size={14} />}
        {imagesExpired ? "Photo expired" : "Photo"}
      </Group>
    );
  }

  return (
    <Group
      gap="xs"
      wrap="nowrap"
      align="center"
      onClick={clickable ? () => onClick(replyTo._id) : undefined}
      style={boxStyle}
    >
      <Box style={{ flex: 1, minWidth: 0 }}>
        {!replyTo.unavailable && (
          <Text size="xs" fw={700} c={textColor}>
            {getSenderName(replyTo.senderId)}
          </Text>
        )}
        <Text
          size="xs"
          c={textColor}
          lineClamp={2}
          style={{ opacity: 0.85, wordBreak: "break-word" }}
          component="div"
        >
          {body}
        </Text>
      </Box>
      {showThumbnail && (
        <QuoteThumbnail
          imageFile={replyTo.imageFile ?? null}
          expired={imagesExpired}
          isCurrentUser={isCurrentUser}
        />
      )}
    </Group>
  );
};

/** One small line in place of photos the server no longer keeps */
const ExpiredPhotos: React.FC<{ count: number; isCurrentUser: boolean }> = ({
  count,
  isCurrentUser,
}) => (
  <Group
    gap={6}
    wrap="nowrap"
    title="This photo is no longer stored on the server"
    style={{
      marginTop: "0.25rem",
      padding: "6px 8px",
      borderRadius: "4px",
      background: isCurrentUser ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.07)",
      color: isCurrentUser ? "rgba(255,255,255,0.85)" : "#495057",
    }}
  >
    <IconPhotoOff size={16} />
    <Text size="xs" c="inherit" fs="italic">
      {count === 1 ? "Photo expired" : `${count} photos expired`}
    </Text>
  </Group>
);

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  msg,
  isCurrentUser,
  sender,
  showSenderName,
  imageBlobUrls,
  failedImageFiles,
  highlighted,
  getSenderName,
  onOpenImages,
  onContextMenu,
  onQuoteClick,
}) => {
  const { colorScheme } = useMantineColorScheme();
  const profileImageUrl = sender?.profileImageUrl || null;
  const isDeleted = Boolean(msg.deletedAt);
  const firstUrl = msg.message ? extractFirstUrl(msg.message) : null;

  const avatar = (
    <Avatar
      src={profileImageUrl || undefined}
      alt={isCurrentUser ? "You" : sender?.nickname || "Member"}
      size="md"
      radius="xl"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = "";
      }}
    />
  );

  const timestampColor = isDeleted
    ? "dimmed"
    : isCurrentUser
      ? "rgba(255,255,255,0.65)"
      : colorScheme === "dark"
        ? "rgba(0,0,0,0.55)"
        : "rgba(0,0,0,0.45)";

  return (
    <Group
      data-message-id={msg._id}
      align="flex-start"
      justify={isCurrentUser ? "flex-end" : "flex-start"}
      gap="xs"
    >
      {!isCurrentUser && avatar}
      <Stack gap={2} style={{ maxWidth: "70%" }}>
        {showSenderName && (
          <Text size="xs" c="dimmed" fw={500} pl={4}>
            {sender?.nickname || "Former member"}
          </Text>
        )}
        <Paper
          p="sm"
          radius="md"
          onContextMenu={isDeleted ? undefined : (e) => onContextMenu(e, msg)}
          style={{
            backgroundColor: isDeleted
              ? "transparent"
              : isCurrentUser
                ? "#387FDF"
                : "#DEE2E6",
            border: isDeleted ? "1px dashed #ADB5BD" : undefined,
            boxShadow: highlighted ? "0 0 0 3px #FAB005" : undefined,
            transition: "box-shadow 0.3s ease",
          }}
        >
          <Stack gap="0.25rem">
            {isDeleted ? (
              <Text size="sm" c="dimmed" fs="italic">
                This message was deleted
              </Text>
            ) : (
              <>
                {msg.replyTo && (
                  <QuotedMessage
                    replyTo={msg.replyTo}
                    isCurrentUser={isCurrentUser}
                    getSenderName={getSenderName}
                    onClick={onQuoteClick}
                  />
                )}
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
                    {parseUrlsInText(msg.message).map((part, idx) =>
                      part.type === "url" ? (
                        <Anchor
                          key={idx}
                          href={getHrefFromUrl(part.content)}
                          target="_blank"
                          rel="noopener noreferrer"
                          c={isCurrentUser ? "rgba(255,255,255,0.9)" : "#1971C2"}
                          fw={500}
                          underline="always"
                          style={{ wordBreak: "break-word", display: "inline" }}
                        >
                          {part.content}
                        </Anchor>
                      ) : (
                        <span key={idx} style={{ display: "inline" }}>
                          {part.content}
                        </span>
                      ),
                    )}
                  </Text>
                )}
                {firstUrl && <LinkPreviewCard url={firstUrl} />}
                {msg.imagesExpiredAt && (msg.imageFiles?.length ?? 0) > 0 && (
                  <ExpiredPhotos
                    count={msg.imageFiles!.length}
                    isCurrentUser={isCurrentUser}
                  />
                )}
                {!msg.imagesExpiredAt && msg.imageFiles && msg.imageFiles.length > 0 && (
                  <SimpleGrid
                    cols={msg.imageFiles.length === 1 ? 1 : 2}
                    spacing="xs"
                    style={{ marginTop: "0.5rem" }}
                  >
                    {msg.imageFiles.map((filename, idx) => {
                      const blobUrl = imageBlobUrls.get(filename);
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
                              .imageFiles!.map((f) => imageBlobUrls.get(f) || "")
                              .filter(Boolean);
                            onOpenImages(blobUrls, idx);
                          }}
                        >
                          {blobUrl ? (
                            <Image
                              src={blobUrl}
                              alt={`Message image ${idx + 1}`}
                              height={250}
                              fit="cover"
                            />
                          ) : failedImageFiles.has(filename) ? (
                            <Group
                              gap={6}
                              justify="center"
                              wrap="nowrap"
                              style={{
                                height: "120px",
                                background:
                                  colorScheme === "dark" ? "#373A40" : "#E9ECEF",
                                color: "#909296",
                              }}
                            >
                              <IconPhotoOff size={18} />
                              <Text size="xs" c="inherit">
                                Photo unavailable
                              </Text>
                            </Group>
                          ) : (
                            <Box
                              style={{
                                height: "250px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background:
                                  colorScheme === "dark" ? "#373A40" : "#E9ECEF",
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
                                  style={{ fontSize: "0.75rem", color: "#909296" }}
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
              </>
            )}
            <Text
              size="10px"
              fw={400}
              style={{ lineHeight: 1.2, letterSpacing: "0.3px" }}
              c={timestampColor}
            >
              {/* An edited message shows when it was last edited; its place
                  in the thread still follows the original send time */}
              {msg.editedAt && !isDeleted
                ? `${formatTimestamp(msg.editedAt)} · edited`
                : formatTimestamp(msg.createdAt)}
            </Text>
          </Stack>
        </Paper>
      </Stack>
      {isCurrentUser && avatar}
    </Group>
  );
};

export const MessageBubble = memo(MessageBubbleComponent);

export default MessageBubble;
