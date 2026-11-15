/**
 * Message Context Menu
 * Right-click menu for a single message, opened at the mouse position:
 * Reply and Copy for any message, Edit and Delete for your own.
 */

import { Menu } from "@mantine/core";
import {
  IconArrowBackUp,
  IconCopy,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { ConversationMessage } from "../services/conversationService";

export interface MessageMenuState {
  message: ConversationMessage;
  x: number;
  y: number;
}

interface MessageContextMenuProps {
  state: MessageMenuState | null;
  currentUserId: string;
  onClose: () => void;
  onReply: (msg: ConversationMessage) => void;
  onCopy: (msg: ConversationMessage) => void;
  onEdit: (msg: ConversationMessage) => void;
  onDelete: (msg: ConversationMessage) => void;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  state,
  currentUserId,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onDelete,
}) => {
  if (!state) return null;

  const { message, x, y } = state;
  const isOwn = message.senderId === currentUserId;
  const hasText = Boolean(message.message);

  return (
    // Keyed by position so a second right-click reopens it at the new spot
    <Menu
      key={`${message._id}-${x}-${y}`}
      opened
      onChange={(opened) => {
        if (!opened) onClose();
      }}
      position="bottom-start"
      offset={2}
      shadow="md"
      width={200}
      withinPortal
    >
      <Menu.Target>
        {/* Zero-size anchor at the mouse position */}
        <div
          style={{
            position: "fixed",
            left: x,
            top: y,
            width: 0,
            height: 0,
          }}
        />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconArrowBackUp size={16} />}
          onClick={() => onReply(message)}
        >
          Reply
        </Menu.Item>
        {hasText && (
          <Menu.Item
            leftSection={<IconCopy size={16} />}
            onClick={() => onCopy(message)}
          >
            Copy text
          </Menu.Item>
        )}
        {isOwn && hasText && (
          <Menu.Item
            leftSection={<IconPencil size={16} />}
            onClick={() => onEdit(message)}
          >
            Edit
          </Menu.Item>
        )}
        {isOwn && (
          <>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => onDelete(message)}
            >
              Delete for everyone
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};

export default MessageContextMenu;
