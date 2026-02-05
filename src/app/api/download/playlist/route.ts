import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

export async function POST(request: NextRequest) {
    try {
        // Verify user is authenticated
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { videoIds, quality } = body;

        // Validate input
        if (!Array.isArray(videoIds) || videoIds.length === 0) {
            return NextResponse.json(
                { error: "videoIds must be a non-empty array" },
                { status: 400 }
            );
        }

        if (videoIds.length > 100) {
            return NextResponse.json(
                { error: "Maximum 100 videos per request" },
                { status: 400 }
            );
        }

        const qualityLevel = quality || 2;
        if (![1, 2, 3].includes(qualityLevel)) {
            return NextResponse.json(
                { error: "Quality must be 1, 2, or 3" },
                { status: 400 }
            );
        }

        // Forward request to external API
        const response = await fetch("https://api.yuzone.me/download/playlist", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                videoIds,
                quality: qualityLevel,
            }),
        });

        // Handle API errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                error: "Failed to download playlist",
            }));
            return NextResponse.json(errorData, { status: response.status });
        }

        // Get the blob from response
        const blob = await response.blob();

        // Return the file with appropriate headers
        return new NextResponse(blob, {
            status: 200,
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": 'attachment; filename="playlist.zip"',
                "Content-Length": blob.size.toString(),
            },
        });
    } catch (error) {
        console.error("Download playlist error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
