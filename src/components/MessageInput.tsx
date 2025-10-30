/**
 * Message Input Component
 */

import { Button, Group, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconSend } from "@tabler/icons-react";
import { useState } from "react";
import { messageService } from "../services/messageService";

interface MessageInputProps {
  friendId: string;
  onMessageSent?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  friendId,
  onMessageSent,
}) => {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      onMessageSent?.();
      notifications.show({
        title: "Success",
        message: "Message sent",
        color: "green",
      });
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Group gap="xs" mt="auto">
      <TextInput
        placeholder="Type a message..."
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
        onKeyPress={handleKeyPress}
        disabled={isLoading}
        style={{ flex: 1 }}
      />
      <Button
        onClick={handleSendMessage}
        loading={isLoading}
        disabled={isLoading || !message.trim()}
        rightSection={<IconSend size={16} />}
      >
        Send
      </Button>
    </Group>
  );
};

export default MessageInput;
