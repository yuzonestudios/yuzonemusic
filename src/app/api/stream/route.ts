import { NextRequest, NextResponse } from "next/server";
import { getProxyStream } from "@/lib/youtube-music";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const videoId = searchParams.get("id");

        if (!videoId) {
            return NextResponse.json(
                { success: false, error: "Video ID is required" },
                { status: 400 }
            );
        }

        // Try External API First (as requested by user)
        try {
            const externalApiUrl = "https://api.yuzone.me/download";
            // console.log(`Proxying stream for ${videoId} via ${externalApiUrl}`);

            const response = await fetch(externalApiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    videoId: videoId,
                    format: "mp3",
                }),
            });

            if (response.ok) {
                // Forward headers primarily Content-Type and Content-Length if available
                const headers = new Headers();
                headers.set("Content-Type", response.headers.get("Content-Type") || "audio/mpeg");
                headers.set("Cache-Control", "public, max-age=3600");

                if (response.headers.has("Content-Length")) {
                    headers.set("Content-Length", response.headers.get("Content-Length")!);
                }

                return new NextResponse(response.body, {
                    status: 200,
                    headers,
                });
            } else {
                console.warn("External API failed, falling back to internal proxy. Status:", response.status);
            }
        } catch (extError) {
            console.warn("External API connection error, falling back to internal proxy:", extError);
        }

        // Fallback to Internal Proxy (Original Implementation)
        // Forward Range header
        const rangeHeader = request.headers.get("range");
        const headers: Record<string, string> = {};
        if (rangeHeader) {
            headers["Range"] = rangeHeader;
        }

        const proxyResponse = await getProxyStream(videoId, headers);

        if (!proxyResponse || !proxyResponse.ok) {
            console.error("Internal proxy stream failed:", proxyResponse?.status, proxyResponse?.statusText);
            return NextResponse.json(
                { success: false, error: "Failed to get stream from both external and internal sources" },
                { status: proxyResponse?.status || 500 }
            );
        }

        // Forward headers from upstream
        const responseHeaders = new Headers();
        responseHeaders.set("Content-Type", proxyResponse.headers.get("Content-Type") || "audio/mp4");

        const contentLength = proxyResponse.headers.get("Content-Length");
        if (contentLength) responseHeaders.set("Content-Length", contentLength);

        const contentRange = proxyResponse.headers.get("Content-Range");
        if (contentRange) responseHeaders.set("Content-Range", contentRange);

        // Next.js handles the stream
        return new NextResponse(proxyResponse.body, {
            status: proxyResponse.status,
            headers: responseHeaders,
        });

    } catch (error) {
        console.error("Stream API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to get stream" },
            { status: 500 }
        );
    }
}
