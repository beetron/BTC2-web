/**
 * Link Preview Service
 * Fetches Open Graph metadata for a URL via the backend (which does the
 * actual fetch server-side to avoid CORS and keep the recipient's IP from
 * being exposed to the linked site). Results are deduped/cached in-memory
 * for the life of the page -- the backend already caches with a TTL, this
 * just avoids redundant calls to our own API within one session.
 */

import { apiClient } from "./apiClient";

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

class LinkPreviewService {
  private api = apiClient.getAxiosInstance();
  private cache = new Map<string, Promise<LinkPreviewData | null>>();

  /**
   * Resolve preview data for a URL, or null if none is available
   * (fetch failed, blocked, or the page has no usable metadata)
   */
  getPreview(url: string): Promise<LinkPreviewData | null> {
    const cached = this.cache.get(url);
    if (cached) return cached;

    const promise = this.fetchPreview(url);
    this.cache.set(url, promise);
    return promise;
  }

  private async fetchPreview(url: string): Promise<LinkPreviewData | null> {
    try {
      const response = await this.api.get<LinkPreviewData>("/link-preview", {
        params: { url },
      });
      const data = response.data;
      if (!data.title && !data.description && !data.image) {
        return null;
      }
      return data;
    } catch (error) {
      console.error("Failed to load link preview:", error);
      return null;
    }
  }
}

export const linkPreviewService = new LinkPreviewService();
export default linkPreviewService;
