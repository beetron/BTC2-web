/**
 * Image Preview Modal Component
 * Displays thumbnails of selected images before upload
 */

import {
  Modal,
  SimpleGrid,
  Image,
  Button,
  Group,
  Stack,
  Text,
  Center,
  Loader,
} from "@mantine/core";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useState, useEffect } from "react";

interface ImagePreviewModalProps {
  opened: boolean;
  onClose: () => void;
  files: File[];
  onRemoveFile: (index: number) => void;
  onConfirm: () => void;
  isUploading: boolean;
  totalSize: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  opened,
  onClose,
  files,
  onRemoveFile,
  onConfirm,
  isUploading,
  totalSize,
}) => {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Generate preview URLs when files change
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Selected Images (${files.length})`}
      size="lg"
      centered
    >
      <Stack gap="md">
        {files.length > 0 ? (
          <>
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="xs">
              {previewUrls.map((url, index) => (
                <div key={index} style={{ position: "relative" }}>
                  <Image
                    src={url}
                    alt={`Preview ${index + 1}`}
                    height={120}
                    fit="cover"
                    radius="md"
                  />
                  <Button
                    size="xs"
                    color="red"
                    variant="filled"
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      padding: "4px 8px",
                    }}
                    leftSection={<IconTrash size={12} />}
                    onClick={() => onRemoveFile(index)}
                    disabled={isUploading}
                  >
                    Remove
                  </Button>
                  <Text size="xs" c="dimmed" style={{ marginTop: "4px" }}>
                    {(files[index].size / (1024 * 1024)).toFixed(2)}MB
                  </Text>
                </div>
              ))}
            </SimpleGrid>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Total: {totalSize}MB
              </Text>
            </Group>
          </>
        ) : (
          <Center h={150}>
            <Text c="dimmed">No images selected</Text>
          </Center>
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={files.length === 0 || isUploading}
            loading={isUploading}
            leftSection={
              isUploading ? <Loader size={14} /> : <IconUpload size={16} />
            }
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ImagePreviewModal;
