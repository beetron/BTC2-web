/**
 * Settings Page
 */

import {
  Box,
  Button,
  Container,
  FileInput,
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
import { IconAlertCircle, IconUpload } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { userService } from "../services/userService";
import { Header } from "../components/Header";
import { getProfileImageUrl } from "../utils/profileImageUtils";

// Validation constraints based on backend model
const VALIDATION_RULES = {
  nickname: {
    minLength: 1,
    maxLength: 20,
  },
  uniqueId: {
    minLength: 6,
    maxLength: 20,
  },
  password: {
    minLength: 6,
  },
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation helper functions
const validateNickname = (nickname: string): string | null => {
  const trimmed = nickname.trim();
  if (!trimmed) {
    return "Nickname cannot be empty";
  }
  if (trimmed.length > VALIDATION_RULES.nickname.maxLength) {
    return `Nickname must be ${VALIDATION_RULES.nickname.maxLength} characters or less`;
  }
  return null;
};

const validateUniqueId = (uniqueId: string): string | null => {
  const trimmed = uniqueId.trim();
  if (!trimmed) {
    return "Unique ID cannot be empty";
  }
  if (trimmed.length < VALIDATION_RULES.uniqueId.minLength) {
    return `Unique ID must be at least ${VALIDATION_RULES.uniqueId.minLength} characters`;
  }
  if (trimmed.length > VALIDATION_RULES.uniqueId.maxLength) {
    return `Unique ID must be ${VALIDATION_RULES.uniqueId.maxLength} characters or less`;
  }
  return null;
};

const validateEmail = (email: string): string | null => {
  const trimmed = email.trim();
  if (!trimmed) {
    return "Email cannot be empty";
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return "Please enter a valid email address";
  }
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) {
    return "Password cannot be empty";
  }
  if (password.length < VALIDATION_RULES.password.minLength) {
    return `Password must be at least ${VALIDATION_RULES.password.minLength} characters`;
  }
  return null;
};

export const SettingsPage: React.FC = () => {
  const [nickname, setNickname] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [email, setEmail] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentProfileImage, setCurrentProfileImage] = useState<string | null>(
    null
  );
  const [selectedImagePreview, setSelectedImagePreview] = useState<
    string | null
  >(null);
  const [isLoadingCurrentImage, setIsLoadingCurrentImage] = useState(true);

  useEffect(() => {
    // Load user info from local storage on mount
    const storedNickname = localStorage.getItem("nickname");
    const storedUniqueId = localStorage.getItem("uniqueId");
    const storedEmail = localStorage.getItem("email");
    const storedProfileImage = localStorage.getItem("userProfileImage");

    if (storedNickname) setNickname(storedNickname);
    if (storedUniqueId) setUniqueId(storedUniqueId);
    if (storedEmail) {
      setCurrentEmail(storedEmail);
    }

    // Load current profile image
    if (storedProfileImage) {
      getProfileImageUrl(storedProfileImage)
        .then((imageUrl) => {
          if (imageUrl) {
            setCurrentProfileImage(imageUrl);
          }
        })
        .catch((error) => {
          console.error("Failed to load profile image:", error);
        })
        .finally(() => {
          setIsLoadingCurrentImage(false);
        });
    } else {
      setIsLoadingCurrentImage(false);
    }
  }, []);
  const handleUpdateNickname = async () => {
    const validationError = validateNickname(nickname);
    if (validationError) {
      notifications.show({
        title: "Validation Error",
        message: validationError,
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      await userService.updateNickname(nickname.trim());
      localStorage.setItem("nickname", nickname.trim());
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
    const validationError = validateUniqueId(uniqueId);
    if (validationError) {
      notifications.show({
        title: "Validation Error",
        message: validationError,
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      await userService.updateUniqueId(uniqueId.trim());
      localStorage.setItem("uniqueId", uniqueId.trim());
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
    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      notifications.show({
        title: "Validation Error",
        message: emailValidationError,
        color: "red",
      });
      return;
    }

    if (!emailChangePassword) {
      notifications.show({
        title: "Validation Error",
        message: "Current password is required to change email",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      await userService.updateEmail(email.trim(), emailChangePassword);
      const trimmedEmail = email.trim();
      localStorage.setItem("email", trimmedEmail);
      setCurrentEmail(trimmedEmail);
      setEmail("");
      setEmailChangePassword("");
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
    // Check if any fields are filled - if all empty, skip
    if (!currentPassword && !newPassword && !confirmPassword) {
      notifications.show({
        title: "Info",
        message: "Please fill in password fields to change password",
        color: "blue",
      });
      return;
    }

    // If any field is filled, all must be filled
    if (!currentPassword || !newPassword || !confirmPassword) {
      notifications.show({
        title: "Validation Error",
        message: "Please fill in all password fields",
        color: "red",
      });
      return;
    }

    // Validate passwords
    const oldPasswordError = validatePassword(currentPassword);
    if (oldPasswordError) {
      notifications.show({
        title: "Validation Error",
        message: `Current password: ${oldPasswordError}`,
        color: "red",
      });
      return;
    }

    const newPasswordError = validatePassword(newPassword);
    if (newPasswordError) {
      notifications.show({
        title: "Validation Error",
        message: `New password: ${newPasswordError}`,
        color: "red",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      notifications.show({
        title: "Validation Error",
        message: "New passwords do not match",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      await userService.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
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
      const response = await userService.updateProfileImage(profileImageFile);

      // Update localStorage with new profile image filename
      if (response.profileImage) {
        localStorage.setItem("userProfileImage", response.profileImage);

        // Reload the current image preview
        setIsLoadingCurrentImage(true);
        const imageUrl = await getProfileImageUrl(response.profileImage);
        if (imageUrl) {
          setCurrentProfileImage(imageUrl);
        }
        setIsLoadingCurrentImage(false);
      }

      setProfileImageFile(null);
      setSelectedImagePreview(null);
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
        setSelectedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <Header />
      <Container size="sm" py="xl">
        <Title mb="lg">Account Settings</Title>

        <Tabs defaultValue="profile">
          <Tabs.List>
            <Tabs.Tab value="profile">Profile</Tabs.Tab>
            <Tabs.Tab value="image">Profile Image</Tabs.Tab>
            <Tabs.Tab value="email">Email & Password</Tabs.Tab>
          </Tabs.List>

          {/* Profile Tab */}
          <Tabs.Panel value="profile" pt="xl">
            <Stack gap="lg">
              <Box>
                <Text fw={500} mb="sm">
                  Nickname
                </Text>
                <Group gap="xs">
                  <TextInput
                    value={nickname}
                    onChange={(e) => setNickname(e.currentTarget.value)}
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
          </Tabs.Panel>

          {/* Profile Image Tab */}
          <Tabs.Panel value="image" pt="xl">
            <Stack gap="lg" align="center">
              <Box>
                <Text fw={500} mb="md" ta="center">
                  Upload Profile Image
                </Text>

                {selectedImagePreview ? (
                  <Center mb="md">
                    <Avatar
                      src={selectedImagePreview}
                      size={150}
                      radius={150}
                    />
                  </Center>
                ) : isLoadingCurrentImage ? (
                  <Center mb="md">
                    <Avatar size={150} radius={150} color="gray">
                      {nickname.charAt(0).toUpperCase()}
                    </Avatar>
                  </Center>
                ) : currentProfileImage ? (
                  <Center mb="md">
                    <Avatar src={currentProfileImage} size={150} radius={150} />
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
                    size="sm"
                    fz="xs"
                  >
                    Upload
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      setProfileImageFile(null);
                      setSelectedImagePreview(null);
                    }}
                    disabled={!profileImageFile || isLoading}
                    size="sm"
                    fz="xs"
                  >
                    Clear
                  </Button>
                </Group>
              </Box>
            </Stack>
          </Tabs.Panel>

          {/* Email & Password Tab */}
          <Tabs.Panel value="email" pt="xl">
            <Stack gap="lg">
              {/* Change Email */}
              <Box>
                <Text fw={500} mb="md">
                  Change Email
                </Text>
                <Stack gap="sm">
                  <Text size="sm" c="dimmed">
                    Current email:{" "}
                    <Text span fw={500} c="inherit">
                      {currentEmail}
                    </Text>
                  </Text>
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
                    value={emailChangePassword}
                    onChange={(e) =>
                      setEmailChangePassword(e.currentTarget.value)
                    }
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
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.currentTarget.value)}
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
                    onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                    disabled={isLoading}
                  />
                  <Button onClick={handleChangePassword} loading={isLoading}>
                    Change Password
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Container>
    </>
  );
};

export default SettingsPage;
