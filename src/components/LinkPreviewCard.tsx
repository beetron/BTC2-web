/**
 * Link Preview Card
 * Small unfurl card rendered beneath a message when it contains a URL.
 * Metadata + image both come through the backend (never fetched directly
 * from the browser) so the linked site never sees the recipient's IP.
 */

import { Anchor, Group, Image, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { linkPreviewService, LinkPreviewData } from "../services/linkPreviewService";
import { loadImageWithAuth } from "../utils/imageLoader";
import { getHrefFromUrl } from "../utils/urlParser";
import { CONFIG } from "../config";

interface LinkPreviewCardProps {
  url: string;
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ url }) => {
  // undefined = loading, null = no preview available
  const [preview, setPreview] = useState<LinkPreviewData | null | undefined>(
    undefined,
  );
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPreview(undefined);
    linkPreviewService.getPreview(url).then((data) => {
      if (!cancelled) setPreview(data);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!preview?.image) {
      setImageDataUrl(null);
      return;
    }
    let cancelled = false;
    const proxyUrl = `${CONFIG.apiUrl}/link-preview/image?url=${encodeURIComponent(
      preview.image,
    )}`;
    loadImageWithAuth(proxyUrl)
      .then((dataUrl) => {
        if (!cancelled) setImageDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setImageDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [preview?.image]);

  if (preview === undefined) {
    return <Skeleton height={64} radius="md" mt={6} width={280} />;
  }

  if (!preview || (!preview.title && !preview.description)) {
    return null;
  }

  let domain = "";
  try {
    domain = new URL(preview.url).hostname.replace(/^www\./, "");
  } catch {
    // Leave domain blank if the cached url is somehow malformed
  }

  return (
    <Anchor
      href={getHrefFromUrl(url)}
      target="_blank"
      rel="noopener noreferrer"
      underline="never"
      style={{ display: "block", maxWidth: 280 }}
    >
      <Paper
        withBorder
        radius="md"
        p={0}
        mt={6}
        style={{ overflow: "hidden" }}
      >
        <Group gap={0} align="stretch" wrap="nowrap">
          {imageDataUrl && (
            <Image
              src={imageDataUrl}
              alt=""
              w={72}
              h={72}
              fit="cover"
              style={{ flexShrink: 0 }}
            />
          )}
          <Stack gap={2} p="xs" style={{ minWidth: 0, flex: 1 }}>
            <Text size="10px" c="dimmed" tt="uppercase" fw={600} truncate>
              {preview.siteName || domain}
            </Text>
            {preview.title && (
              <Text size="xs" fw={600} lineClamp={2} c="var(--mantine-color-text)">
                {preview.title}
              </Text>
            )}
            {preview.description && (
              <Text size="xs" c="dimmed" lineClamp={2}>
                {preview.description}
              </Text>
            )}
          </Stack>
        </Group>
      </Paper>
    </Anchor>
  );
};

export default LinkPreviewCard;
