/**
 * Group Manage Modal
 * Rename group, view members with roles, add/remove members, leave group.
 * Rename/remove actions follow the API's owner/admin permission rules.
 */

import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconUserMinus, IconUserPlus, IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import {
  conversationService,
  ConversationDetail,
} from "../services/conversationService";
import { userService } from "../services/userService";
import { FriendSelectList } from "./FriendSelectList";
import { getProfileImageUrl } from "../utils/profileImageUtils";

interface GroupManageModalProps {
  opened: boolean;
  onClose: () => void;
  detail: ConversationDetail;
  currentUserId: string;
  /** Called after any change so the parent can refetch the detail */
  onChanged: () => void;
  /** Called after the current user leaves the group */
  onLeft: () => void;
}

const roleColor = (role: string) =>
  role === "owner" ? "grape" : role === "admin" ? "blue" : "gray";

export const GroupManageModal: React.FC<GroupManageModalProps> = ({
  opened,
  onClose,
  detail,
  currentUserId,
  onChanged,
  onLeft,
}) => {
  const [name, setName] = useState(detail.name || "");
  const [memberImageUrls, setMemberImageUrls] = useState<
    Record<string, string | null>
  >({});
  const [addSelectedIds, setAddSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(
    null,
  );

  const myRole =
    detail.members.find((m) => m.userId === currentUserId)?.role || "member";
  const canManage = myRole === "owner" || myRole === "admin";

  useEffect(() => {
    setName(detail.name || "");
  }, [detail.name]);

  // Resolve member avatars
  useEffect(() => {
    const loadImages = async () => {
      const entries = await Promise.all(
        detail.members.map(async (m) => [
          m.userId,
          m.profileImage ? await getProfileImageUrl(m.profileImage) : null,
        ]),
      );
      setMemberImageUrls(Object.fromEntries(entries));
    };
    loadImages();
  }, [detail.members]);

  // Resolve which members are already friends, so a member NOT in this list
  // can be offered an "Add Friend" shortcut instead of the remove action
  useEffect(() => {
    if (!opened) return;
    setSentRequestIds(new Set());
    const loadFriendIds = async () => {
      try {
        const friends = await userService.getFriendList();
        setFriendIds(new Set(friends.map((f) => f._id)));
      } catch (error) {
        console.error("Error loading friend list:", error);
      }
    };
    loadFriendIds();
  }, [opened]);

  const showError = (error: unknown, fallback: string) => {
    notifications.show({
      title: "Error",
      message: error instanceof Error ? error.message : fallback,
      color: "red",
    });
  };

  const handleRename = async () => {
    if (!name.trim() || name.trim() === detail.name) return;
    setIsSaving(true);
    try {
      await conversationService.updateGroup(detail.conversationId, {
        name: name.trim(),
      });
      notifications.show({
        title: "Group updated",
        message: "Group name changed",
        color: "green",
      });
      onChanged();
    } catch (error) {
      showError(error, "Failed to rename group");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMembers = async () => {
    if (addSelectedIds.length === 0) return;
    setIsAdding(true);
    try {
      await conversationService.addMembers(
        detail.conversationId,
        addSelectedIds,
      );
      notifications.show({
        title: "Members added",
        message: `${addSelectedIds.length} member(s) added`,
        color: "green",
      });
      setAddSelectedIds([]);
      onChanged();
    } catch (error) {
      showError(error, "Failed to add members");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddFriend = async (member: ConversationDetail["members"][number]) => {
    if (!member.uniqueId) {
      showError(null, "This member's ID isn't available");
      return;
    }
    setSendingRequestId(member.userId);
    try {
      await userService.sendFriendRequest(member.uniqueId);
      notifications.show({
        title: "Friend request sent",
        message: `Sent a friend request to ${member.nickname || "this member"}`,
        color: "green",
      });
      setSentRequestIds((prev) => new Set(prev).add(member.userId));
    } catch (error) {
      showError(error, "Failed to send friend request");
    } finally {
      setSendingRequestId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemovingId(userId);
    try {
      await conversationService.removeMember(detail.conversationId, userId);
      onChanged();
    } catch (error) {
      showError(error, "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      await conversationService.removeMember(
        detail.conversationId,
        currentUserId,
      );
      notifications.show({
        title: "Left group",
        message: `You left "${detail.name}"`,
        color: "blue",
      });
      onLeft();
    } catch (error) {
      showError(error, "Failed to leave group");
      setIsLeaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Group Settings"
      centered
      size="md"
    >
      <Stack gap="md">
        {/* Rename (owner/admin only) */}
        {canManage && (
          <Group gap="sm" align="flex-end">
            <TextInput
              label="Group name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              maxLength={60}
              style={{ flex: 1 }}
            />
            <Button
              onClick={handleRename}
              loading={isSaving}
              disabled={!name.trim() || name.trim() === detail.name}
            >
              Save
            </Button>
          </Group>
        )}

        {/* Member list */}
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Members ({detail.members.length})
          </Text>
          <Stack gap="xs" style={{ maxHeight: "240px", overflowY: "auto" }}>
            {detail.members.map((member) => {
              const isSelf = member.userId === currentUserId;
              // Owners are never removable from the UI; admins/members are
              // removable by owner/admin. Self-removal happens via Leave.
              const canRemove =
                canManage && !isSelf && member.role !== "owner";
              const isFriend = isSelf || friendIds.has(member.userId);
              const requestSent = sentRequestIds.has(member.userId);

              return (
                <Group
                  key={member.userId}
                  gap="sm"
                  align="center"
                  justify="space-between"
                >
                  <Group gap="sm" align="center">
                    <Avatar
                      src={memberImageUrls[member.userId] || undefined}
                      alt={member.nickname || "Member"}
                      size="md"
                      radius="xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "";
                      }}
                    />
                    <Text size="sm" fw={500}>
                      {member.nickname || "Unknown"}
                      {isSelf ? " (you)" : ""}
                    </Text>
                    <Badge
                      size="xs"
                      variant="light"
                      color={roleColor(member.role)}
                    >
                      {member.role}
                    </Badge>
                  </Group>
                  <Group gap={4}>
                    {!isFriend &&
                      (requestSent ? (
                        <ActionIcon
                          variant="light"
                          color="gray"
                          size="sm"
                          disabled
                          title="Friend request sent"
                        >
                          <IconCheck size={14} />
                        </ActionIcon>
                      ) : (
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="sm"
                          title={`Add ${member.nickname || "member"} as friend`}
                          loading={sendingRequestId === member.userId}
                          onClick={() => handleAddFriend(member)}
                        >
                          <IconUserPlus size={14} />
                        </ActionIcon>
                      ))}
                    {canRemove && (
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="sm"
                        title={`Remove ${member.nickname || "member"}`}
                        loading={removingId === member.userId}
                        onClick={() => handleRemoveMember(member.userId)}
                      >
                        <IconUserMinus size={14} />
                      </ActionIcon>
                    )}
                  </Group>
                </Group>
              );
            })}
          </Stack>
        </Stack>

        {/* Add members (any active member may add their own friends) */}
        <Divider />
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Add members
          </Text>
          <FriendSelectList
            selectedIds={addSelectedIds}
            onChange={setAddSelectedIds}
            excludeIds={detail.members.map((m) => m.userId)}
            emptyMessage="All your friends are already in this group"
          />
          {addSelectedIds.length > 0 && (
            <Button
              onClick={handleAddMembers}
              loading={isAdding}
              variant="light"
            >
              Add {addSelectedIds.length} member(s)
            </Button>
          )}
        </Stack>

        {/* Leave group */}
        <Divider />
        {confirmLeave ? (
          <Group justify="space-between" align="center">
            <Text size="sm">Leave this group?</Text>
            <Group gap="sm">
              <Button
                variant="light"
                size="xs"
                onClick={() => setConfirmLeave(false)}
                disabled={isLeaving}
              >
                Cancel
              </Button>
              <Button
                color="red"
                size="xs"
                onClick={handleLeave}
                loading={isLeaving}
              >
                Leave
              </Button>
            </Group>
          </Group>
        ) : (
          <Button
            color="red"
            variant="light"
            onClick={() => setConfirmLeave(true)}
          >
            Leave group
          </Button>
        )}
      </Stack>
    </Modal>
  );
};

export default GroupManageModal;
