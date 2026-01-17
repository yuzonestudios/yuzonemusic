/**
 * Utility functions for API endpoints
 */

import { NextResponse } from "next/server";
import { APIResponse } from "@/types/api";

/**
 * Create a standardized success response
 */
export function successResponse<T>(data: T, statusCode = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    } as APIResponse<T>,
    {
      status: statusCode,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Cache": "MISS",
      },
    }
  );
}

/**
 * Create a standardized error response
 */
export function errorResponse(error: string, details?: string, statusCode = 500) {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
      timestamp: new Date().toISOString(),
    } as APIResponse<null>,
    { status: statusCode }
  );
}

/**
 * Validate and parse quality parameter
 */
export function parseQuality(quality?: string | null): 1 | 2 | 3 {
  const qualityNum = parseInt(quality || "2", 10);
  if (qualityNum === 1 || qualityNum === 3) {
    return qualityNum;
  }
  return 2; // default
}

/**
 * Validate and parse search type parameter
 */
export function parseSearchType(type?: string | null): "all" | "songs" | "artists" | "albums" {
  const validTypes = ["songs", "artists", "albums", "all"];
  if (validTypes.includes(type || "")) {
    return (type as any) || "all";
  }
  return "all";
}

/**
 * Format duration from seconds to MM:SS
 */
export function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds === 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Extract thumbnail URL with protocol
 */
export function extractThumbnail(thumbnails: Array<{ url: string }> | undefined): string {
  if (thumbnails && thumbnails.length > 0) {
    const thumb = thumbnails[thumbnails.length - 1];
    return thumb.url.startsWith("//") ? `https:${thumb.url}` : thumb.url;
  }
  return "/placeholder-album.png";
}
