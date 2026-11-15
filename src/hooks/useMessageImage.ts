/**
 * Loads one message image (with the auth header) for a small preview, such
 * as the thumbnail of a quoted photo. Shares the image cache with the full
 * images in the thread, so a photo already on screen is not downloaded
 * again.
 */

import { useEffect, useState } from "react";
import { loadImageWithAuth, messageImageUrl } from "../utils/imageLoader";

export interface MessageImageState {
  /** Data URL once loaded */
  src: string | null;
  /** The file could not be loaded, e.g. it expired on the server */
  failed: boolean;
}

export const useMessageImage = (
  filename: string | null | undefined,
): MessageImageState => {
  const [state, setState] = useState<MessageImageState & { filename?: string | null }>({
    src: null,
    failed: false,
  });

  useEffect(() => {
    if (!filename) return;
    let cancelled = false;
    loadImageWithAuth(messageImageUrl(filename))
      .then((src) => {
        if (!cancelled) setState({ filename, src, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ filename, src: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [filename]);

  // A result for an earlier filename never shows for the current one
  if (!filename || state.filename !== filename) return { src: null, failed: false };
  return { src: state.src, failed: state.failed };
};
