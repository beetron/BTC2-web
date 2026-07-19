/**
 * Create Group Modal
 * Name + friend multi-select -> POST /conversations/group
 */

import { Button, Group, Modal, Stack, TextInput, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { conversationService } from "../services/conversationService";
import { FriendSelectList } from "./FriendSelectList";

interface CreateGroupModalProps {
  opened: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  opened,
  onClose,
}) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleClose = () => {
    setName("");
    setSelectedIds([]);
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedIds.length === 0) return;

    setIsCreating(true);
    try {
      const group = await conversationService.createGroup(
        name.trim(),
        selectedIds,
      );
      notifications.show({
        title: "Group created",
        message: `"${name.trim()}" is ready`,
        color: "green",
      });
      handleClose();
      navigate(`/messages/${group._id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create group";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Create Group" centered>
      <Stack gap="md">
        <TextInput
          label="Group name"
          placeholder="Enter group name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={60}
          data-autofocus
        />
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Members
          </Text>
          <FriendSelectList
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            emptyMessage="Add friends first to create a group"
          />
        </Stack>
        <Group justify="flex-end" gap="sm">
          <Button variant="light" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            loading={isCreating}
            disabled={!name.trim() || selectedIds.length === 0}
          >
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default CreateGroupModal;
