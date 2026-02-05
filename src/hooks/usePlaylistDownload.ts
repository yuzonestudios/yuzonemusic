/**
 * Hook for handling playlist downloads
 * Uses the /download/playlist endpoint to batch download songs as a ZIP file
 */

import { useState, useCallback } from "react";

export interface DownloadOptions {
  quality?: 1 | 2 | 3; // 1 = low/96kbps, 2 = medium/128kbps, 3 = high/320kbps
}

export interface DownloadProgress {
  isDownloading: boolean;
  progress: number; // 0-100
  error: string | null;
  successCount: number;
  totalCount: number;
}

export function usePlaylistDownload() {
  const [progress, setProgress] = useState<DownloadProgress>({
    isDownloading: false,
    progress: 0,
    error: null,
    successCount: 0,
    totalCount: 0,
  });

  const downloadPlaylist = useCallback(
    async (
      videoIds: string[],
      playlistName: string,
      options: DownloadOptions = { quality: 2 }
    ) => {
      // Validate input
      if (!videoIds || videoIds.length === 0) {
        setProgress((prev) => ({
          ...prev,
          error: "No songs to download",
        }));
        return;
      }

      if (videoIds.length > 100) {
        setProgress((prev) => ({
          ...prev,
          error: "Maximum 100 videos per request",
        }));
        return;
      }

      setProgress({
        isDownloading: true,
        progress: 0,
        error: null,
        successCount: 0,
        totalCount: videoIds.length,
      });

      try {
        // Call the playlist download endpoint
        const response = await fetch("/api/download/playlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            videoIds,
            quality: options.quality || 2,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Download failed with status ${response.status}`
          );
        }

        // Get the ZIP file blob
        const blob = await response.blob();

        // Create a download link and trigger the download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${playlistName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Update progress - we don't have the exact count of successful downloads
        // but we assume success if the ZIP was returned
        setProgress({
          isDownloading: false,
          progress: 100,
          error: null,
          successCount: videoIds.length,
          totalCount: videoIds.length,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Download error:", errorMessage);

        setProgress((prev) => ({
          ...prev,
          isDownloading: false,
          error: errorMessage,
        }));
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setProgress({
      isDownloading: false,
      progress: 0,
      error: null,
      successCount: 0,
      totalCount: 0,
    });
  }, []);

  return {
    ...progress,
    downloadPlaylist,
    clearError,
    reset,
  };
}
