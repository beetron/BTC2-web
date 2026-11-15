/**
 * Message Input Component
 * Sends text and images, and doubles as the reply and edit box: a bar above
 * the textarea shows the message being replied to or edited.
 */

import { ActionIcon, Box, Button, Group, Stack, Text, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconSend,
  IconPaperclip,
  IconArrowBackUp,
  IconPencil,
  IconCheck,
  IconX,
  IconPhotoOff,
} from "@tabler/icons-react";
import { useState, useRef, useEffect } from "react";
import { useMessageImage } from "../hooks/useMessageImage";
import {
  conversationService,
  ConversationMessage,
} from "../services/conversationService";
import { ImagePreviewModal } from "./ImagePreviewModal";
import {
  validateImageFiles,
  calculateTotalSize,
} from "../utils/imageValidation";
import { newClientMessageId } from "../utils/clientMessageId";

// Same limit the API enforces (MAX_MESSAGE_LENGTH)
const MAX_MESSAGE_LENGTH = 10000;

interface MessageInputProps {
  conversationId: string;
  /** The message being replied to, with its sender's display name */
  replyTo?: { message: ConversationMessage; senderName: string } | null;
  /** Our own message being edited */
  editing?: ConversationMessage | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  /** The stored message after a send or upload */
  onMessageSent?: (message: ConversationMessage) => void;
  /** The stored message after an edit */
  onMessageEdited?: (message: ConversationMessage) => void;
  onInputResize?: () => void;
}

const replySnippet = (msg: ConversationMessage): string => {
  if (msg.message) return msg.message;
  if (msg.imageFiles && msg.imageFiles.length > 0) {
    return msg.imagesExpiredAt ? "Photo expired" : "Photo";
  }
  return "";
};

/** Thumbnail of the first photo of the message being replied to */
const ReplyThumbnail: React.FC<{ message: ConversationMessage }> = ({ message }) => {
  const hasImages = (message.imageFiles?.length ?? 0) > 0;
  const expired = Boolean(message.imagesExpiredAt);
  const { src, failed } = useMessageImage(
    hasImages && !expired ? message.imageFiles![0] : null,
  );
  if (!hasImages) return null;

  return (
    <Box
      style={{
        width: 32,
        height: 32,
        flexShrink: 0,
        borderRadius: "4px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--mantine-color-default-border)",
        color: "var(--mantine-color-dimmed)",
      }}
    >
      {src ? (
        <img
          src={src}
          alt="Photo being replied to"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        (expired || failed) && <IconPhotoOff size={16} />
      )}
    </Box>
  );
};

export const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  replyTo,
  editing,
  onCancelReply,
  onCancelEdit,
  onMessageSent,
  onMessageEdited,
  onInputResize,
}) => {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The text typed before an edit started, put back when the edit ends
  const draftBeforeEditRef = useRef<string | null>(null);
  // A send that failed keeps its clientMessageId, so sending the same thing
  // again cannot store it twice if the first attempt did reach the API
  const pendingSendRef = useRef<{
    text: string;
    replyToId?: string;
    clientMessageId: string;
  } | null>(null);
  const pendingUploadRef = useRef<{
    files: File[];
    clientMessageId: string;
  } | null>(null);

  // A retry id is only valid within its own conversation
  useEffect(() => {
    pendingSendRef.current = null;
    pendingUploadRef.current = null;
  }, [conversationId]);

  // Entering edit mode fills the box with the message; leaving restores
  // whatever was typed before
  const editingId = editing?._id ?? null;
  useEffect(() => {
    if (editingId && editing) {
      if (draftBeforeEditRef.current === null) {
        draftBeforeEditRef.current = message;
      }
      setMessage(editing.message ?? "");
      textareaRef.current?.focus();
    } else if (draftBeforeEditRef.current !== null) {
      setMessage(draftBeforeEditRef.current);
      draftBeforeEditRef.current = null;
    }
    // Only when the edited message changes, not on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const replyToId = replyTo?.message._id ?? null;
  useEffect(() => {
    if (replyToId) textareaRef.current?.focus();
  }, [replyToId]);

  // Auto-expand textarea up to 5 lines
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to calculate scrollHeight correctly
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      // Max 5 lines (approximately 5 * 24px per line + padding)
      const maxHeight = 5 * 24 + 16; // 16px for padding
      textareaRef.current.style.height = `${Math.min(
        scrollHeight,
        maxHeight
      )}px`;
      // Notify parent component to scroll message list to bottom
      onInputResize?.();
    }
  }, [message, onInputResize, replyToId, editingId]);

  const resetTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const showError = (error: unknown, fallback: string) => {
    notifications.show({
      title: "Error",
      message: error instanceof Error ? error.message : fallback,
      color: "red",
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setIsLoading(true);
    try {
      const updated = await conversationService.editMessage(
        conversationId,
        editing._id,
        message,
      );
      onMessageEdited?.(updated);
      // Leaving edit mode puts the earlier draft back (effect above)
      onCancelEdit?.();
    } catch (error) {
      showError(error, "Failed to edit message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      notifications.show({
        title: "Error",
        message: "Please enter a message",
        color: "red",
      });
      return;
    }

    if (editing) {
      await handleSaveEdit();
      return;
    }

    const pending = pendingSendRef.current;
    const replyId = replyToId ?? undefined;
    const clientMessageId =
      pending && pending.text === message && pending.replyToId === replyId
        ? pending.clientMessageId
        : newClientMessageId();
    pendingSendRef.current = { text: message, replyToId: replyId, clientMessageId };

    setIsLoading(true);
    try {
      const result = await conversationService.sendMessage(
        conversationId,
        message,
        { clientMessageId, replyToId: replyId },
      );
      pendingSendRef.current = null;
      setMessage("");
      resetTextarea();
      onCancelReply?.();
      onMessageSent?.(result.message);
    } catch (error) {
      showError(error, "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter without Shift
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Escape leaves edit or reply mode
    if (e.key === "Escape") {
      if (editing) {
        e.preventDefault();
        onCancelEdit?.();
      } else if (replyTo) {
        e.preventDefault();
        onCancelReply?.();
      }
    }
    // Allow Shift+Enter for line breaks (default textarea behavior)
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validation = validateImageFiles(files);
    if (!validation.isValid) {
      validation.errors.forEach((error) => {
        notifications.show({
          title: "Invalid File",
          message: error,
          color: "red",
        });
      });
      return;
    }

    setSelectedFiles(files);
    setPreviewModalOpen(true);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadImages = async () => {
    if (selectedFiles.length === 0) return;

    // Same files as a failed attempt: reuse its id (see pendingSendRef)
    const pending = pendingUploadRef.current;
    const clientMessageId =
      pending && pending.files === selectedFiles
        ? pending.clientMessageId
        : newClientMessageId();
    pendingUploadRef.current = { files: selectedFiles, clientMessageId };

    setIsUploadingImages(true);
    try {
      const result = await conversationService.uploadImages(
        conversationId,
        selectedFiles,
        { clientMessageId, replyToId: replyToId ?? undefined },
      );
      pendingUploadRef.current = null;
      notifications.show({
        title: "Success",
        message: `${selectedFiles.length} image(s) uploaded successfully`,
        color: "green",
      });
      setSelectedFiles([]);
      setPreviewModalOpen(false);
      onCancelReply?.();
      onMessageSent?.(result.message);
    } catch (error) {
      showError(error, "Failed to upload images");
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleFileIconClick = () => {
    fileInputRef.current?.click();
  };

  const busy = isLoading || isUploadingImages;
  const editUnchanged = editing !== null && editing !== undefined && message === editing.message;

  // Reply or edit bar shown above the input
  let contextBar: React.ReactNode = null;
  if (editing) {
    contextBar = (
      <ContextBar
        icon={<IconPencil size={16} />}
        title="Editing message"
        snippet={editing.message ?? ""}
        onCancel={() => onCancelEdit?.()}
        cancelLabel="Cancel edit"
      />
    );
  } else if (replyTo) {
    contextBar = (
      <ContextBar
        icon={<IconArrowBackUp size={16} />}
        title={`Replying to ${replyTo.senderName}`}
        snippet={replySnippet(replyTo.message)}
        thumbnail={<ReplyThumbnail message={replyTo.message} />}
        onCancel={() => onCancelReply?.()}
        cancelLabel="Cancel reply"
      />
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
      />
      <Stack gap={4} mt="auto">
        {contextBar}
        <Group gap="xs" align="flex-end">
          <Button
            onClick={handleFileIconClick}
            variant="subtle"
            size="sm"
            p="xs"
            disabled={busy || Boolean(editing)}
            title="Attach images"
            leftSection={<IconPaperclip size={16} />}
          />
          <Textarea
            ref={textareaRef}
            placeholder="Type a message... (Shift+Enter for line break)"
            value={message}
            onChange={(e) => setMessage(e.currentTarget.value)}
            onKeyDown={handleKeyPress}
            disabled={busy}
            maxLength={MAX_MESSAGE_LENGTH}
            minRows={1}
            maxRows={5}
            autoFocus
            style={{ flex: 1 }}
            styles={{
              input: {
                resize: "none",
                lineHeight: "1.5",
              },
            }}
          />
          <Button
            onClick={handleSendMessage}
            loading={isLoading}
            disabled={busy || !message.trim() || editUnchanged}
            rightSection={
              editing ? <IconCheck size={16} /> : <IconSend size={16} />
            }
          >
            {editing ? "Save" : "Send"}
          </Button>
        </Group>
      </Stack>

      <ImagePreviewModal
        opened={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        files={selectedFiles}
        onRemoveFile={handleRemoveFile}
        onConfirm={handleUploadImages}
        isUploading={isUploadingImages}
        totalSize={calculateTotalSize(selectedFiles)}
      />
    </>
  );
};

const ContextBar: React.FC<{
  icon: React.ReactNode;
  title: string;
  snippet: string;
  thumbnail?: React.ReactNode;
  cancelLabel: string;
  onCancel: () => void;
}> = ({ icon, title, snippet, thumbnail, cancelLabel, onCancel }) => (
  <Group
    gap="xs"
    wrap="nowrap"
    px="sm"
    py={6}
    style={{
      borderLeft: "3px solid #387FDF",
      background: "var(--mantine-color-default-hover)",
      borderRadius: "4px",
    }}
  >
    <Box c="#387FDF" style={{ display: "flex" }}>
      {icon}
    </Box>
    <Box style={{ flex: 1, minWidth: 0 }}>
      <Text size="xs" fw={700}>
        {title}
      </Text>
      <Text size="xs" c="dimmed" truncate>
        {snippet}
      </Text>
    </Box>
    {thumbnail}
    <ActionIcon
      variant="subtle"
      color="gray"
      size="sm"
      onClick={onCancel}
      title={cancelLabel}
      aria-label={cancelLabel}
    >
      <IconX size={14} />
    </ActionIcon>
  </Group>
);

export default MessageInput;
