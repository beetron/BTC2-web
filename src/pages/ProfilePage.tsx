/**
 * Profile Page
 */

import {
  Box,
  Button,
  Container,
  FileInput,
  Grid,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  Tabs,
  Alert,
  Avatar,
  Center,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconUpload,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "../services/userService";

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );

  useEffect(() => {
    // Load user info from localStorage if available
    // In a real app, you'd fetch this from an API
    const storedNickname = localStorage.getItem("nickname");
    const storedUniqueId = localStorage.getItem("uniqueId");
    const storedEmail = localStorage.getItem("email");

    if (storedNickname) setNickname(storedNickname);
    if (storedUniqueId) setUniqueId(storedUniqueId);
    if (storedEmail) setEmail(storedEmail);
  }, []);

  const handleUpdateNickname = async () => {
    if (!nickname.trim()) {
      notifications.show({
        title: "Error",
        message: "Nickname cannot be empty",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      await userService.updateNickname(nickname);
      localStorage.setItem("nickname", nickname);
      notifications.show({
        title: "Success",
        message: "Nickname updated successfully",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update nickname";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUniqueId = async () => {
    if (!uniqueId.trim()) {
      notifications.show({
        title: "Error",
        message: "Unique ID cannot be empty",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      await userService.updateUniqueId(uniqueId);
      localStorage.setItem("uniqueId", uniqueId);
      notifications.show({
        title: "Success",
        message: "Unique ID updated successfully",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update unique ID";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!email.trim()) {
      notifications.show({
        title: "Error",
        message: "Email cannot be empty",
        color: "red",
      });
      return;
    }

    if (!oldPassword) {
      notifications.show({
        title: "Error",
        message: "Current password is required to change email",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      await userService.updateEmail(email, oldPassword);
      localStorage.setItem("email", email);
      setOldPassword("");
      notifications.show({
        title: "Success",
        message: "Email updated successfully",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update email";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      notifications.show({
        title: "Error",
        message: "Please fill in all password fields",
        color: "red",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      notifications.show({
        title: "Error",
        message: "New passwords do not match",
        color: "red",
      });
      return;
    }

    if (newPassword.length < 6) {
      notifications.show({
        title: "Error",
        message: "New password must be at least 6 characters",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      await userService.changePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notifications.show({
        title: "Success",
        message: "Password changed successfully",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to change password";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfileImage = async () => {
    if (!profileImageFile) {
      notifications.show({
        title: "Error",
        message: "Please select an image file",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      await userService.updateProfileImage(profileImageFile);
      setProfileImageFile(null);
      setProfileImagePreview(null);
      notifications.show({
        title: "Success",
        message: "Profile image updated successfully",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update profile image";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file: File | null) => {
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Container py="xl">
      <Group mb="lg">
        <Button
          variant="default"
          onClick={() => navigate("/chat")}
          leftSection={<IconArrowLeft size={16} />}
        >
          Back to Chat
        </Button>
        <Title>Account Settings</Title>
      </Group>

      <Tabs defaultValue="profile">
        <Tabs.List>
          <Tabs.Tab value="profile">Profile</Tabs.Tab>
          <Tabs.Tab value="email">Email & Password</Tabs.Tab>
          <Tabs.Tab value="image">Profile Image</Tabs.Tab>
        </Tabs.List>

        {/* Profile Tab */}
        <Tabs.Panel value="profile" pt="xl">
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="lg">
                <Box>
                  <Text fw={500} mb="sm">
                    Nickname
                  </Text>
                  <Group gap="xs">
                    <TextInput
                      value={nickname}
                      onChange={(e) => setNickname(e.currentTarget.value)}
                      placeholder="Your nickname"
                      disabled={isLoading}
                      style={{ flex: 1 }}
                    />
                    <Button onClick={handleUpdateNickname} loading={isLoading}>
                      Update
                    </Button>
                  </Group>
                </Box>

                <Box>
                  <Text fw={500} mb="sm">
                    Unique ID
                  </Text>
                  <Group gap="xs">
                    <TextInput
                      value={uniqueId}
                      onChange={(e) => setUniqueId(e.currentTarget.value)}
                      placeholder="Your unique ID"
                      disabled={isLoading}
                      style={{ flex: 1 }}
                    />
                    <Button onClick={handleUpdateUniqueId} loading={isLoading}>
                      Update
                    </Button>
                  </Group>
                </Box>
              </Stack>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* Email & Password Tab */}
        <Tabs.Panel value="email" pt="xl">
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="lg">
                {/* Change Email */}
                <Box>
                  <Text fw={500} mb="md">
                    Change Email
                  </Text>
                  <Stack gap="sm">
                    <TextInput
                      label="New Email"
                      placeholder="newemail@example.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.currentTarget.value)}
                      disabled={isLoading}
                    />
                    <PasswordInput
                      label="Current Password"
                      placeholder="Enter your password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.currentTarget.value)}
                      disabled={isLoading}
                    />
                    <Button onClick={handleUpdateEmail} loading={isLoading}>
                      Update Email
                    </Button>
                  </Stack>
                </Box>

                {/* Change Password */}
                <Box>
                  <Text fw={500} mb="md">
                    Change Password
                  </Text>
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    title="Info"
                    color="blue"
                    mb="md"
                  >
                    Leave fields empty to skip password change
                  </Alert>
                  <Stack gap="sm">
                    <PasswordInput
                      label="Current Password"
                      placeholder="Enter your current password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.currentTarget.value)}
                      disabled={isLoading}
                    />
                    <PasswordInput
                      label="New Password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.currentTarget.value)}
                      disabled={isLoading}
                    />
                    <PasswordInput
                      label="Confirm Password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.currentTarget.value)
                      }
                      disabled={isLoading}
                    />
                    <Button onClick={handleChangePassword} loading={isLoading}>
                      Change Password
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* Profile Image Tab */}
        <Tabs.Panel value="image" pt="xl">
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="lg" align="center">
                <Box>
                  <Text fw={500} mb="md" ta="center">
                    Upload Profile Image
                  </Text>

                  {profileImagePreview ? (
                    <Center mb="md">
                      <Avatar
                        src={profileImagePreview}
                        size={150}
                        radius={150}
                      />
                    </Center>
                  ) : (
                    <Center mb="md">
                      <Avatar size={150} radius={150} color="blue">
                        {nickname.charAt(0).toUpperCase()}
                      </Avatar>
                    </Center>
                  )}

                  <FileInput
                    label="Choose Image"
                    placeholder="Click to select file"
                    leftSection={<IconUpload size={14} />}
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    value={profileImageFile}
                    onChange={handleFileSelect}
                    disabled={isLoading}
                  />

                  <Group mt="md" grow>
                    <Button
                      onClick={handleUpdateProfileImage}
                      loading={isLoading}
                      disabled={!profileImageFile}
                    >
                      Upload
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => {
                        setProfileImageFile(null);
                        setProfileImagePreview(null);
                      }}
                      disabled={!profileImageFile || isLoading}
                    >
                      Clear
                    </Button>
                  </Group>
                </Box>
              </Stack>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default ProfilePage;
