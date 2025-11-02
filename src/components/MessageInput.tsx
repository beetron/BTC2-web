/**
 * Message Input Component
 */

import { Button, Group, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconSend, IconPaperclip } from "@tabler/icons-react";
import { useState, useRef, useEffect } from "react";
import { messageService } from "../services/messageService";
import { ImagePreviewModal } from "./ImagePreviewModal";
import {
  validateImageFiles,
  calculateTotalSize,
} from "../utils/imageValidation";

interface MessageInputProps {
  friendId: string;
  onMessageSent?: () => void;
  onInputResize?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  friendId,
  onMessageSent,
  onInputResize,
}) => {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [message, onInputResize]);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      notifications.show({
        title: "Error",
        message: "Please enter a message",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      await messageService.sendMessage(friendId, { message });
      setMessage("");
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      // Trigger refresh after successful send
      await onMessageSent?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send message";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
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

    setIsUploadingImages(true);
    try {
      const result = await messageService.uploadImages(friendId, selectedFiles);
      if (result.success) {
        notifications.show({
          title: "Success",
          message: `${selectedFiles.length} image(s) uploaded successfully`,
          color: "green",
        });
        setSelectedFiles([]);
        setPreviewModalOpen(false);
        // Trigger refresh to show new images
        await onMessageSent?.();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload images";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleFileIconClick = () => {
    fileInputRef.current?.click();
  };

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
      <Group gap="xs" mt="auto" align="flex-end">
        <Button
          onClick={handleFileIconClick}
          variant="subtle"
          size="sm"
          p="xs"
          disabled={isLoading || isUploadingImages}
          title="Attach images"
          leftSection={<IconPaperclip size={16} />}
        />
        <Textarea
          ref={textareaRef}
          placeholder="Type a message... (Shift+Enter for line break)"
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          onKeyDown={handleKeyPress}
          disabled={isLoading || isUploadingImages}
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
          disabled={isLoading || !message.trim() || isUploadingImages}
          rightSection={<IconSend size={16} />}
        >
          Send
        </Button>
      </Group>

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

export default MessageInput;
