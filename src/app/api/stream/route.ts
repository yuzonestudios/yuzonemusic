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

            const response = await fetch(externalApiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    videoId: videoId,
                    format: "mp4",
                }),
                cache: 'no-store'
            });

            if (response.ok) {
                const contentType = response.headers.get("Content-Type") || "audio/mpeg";
                const contentLength = response.headers.get("Content-Length");

                const responseHeaders = new Headers();
                responseHeaders.set("Content-Type", contentType);
                responseHeaders.set("Cache-Control", "no-cache, must-revalidate");
                responseHeaders.set("Accept-Ranges", "bytes");
                responseHeaders.set("Access-Control-Allow-Origin", "*");

                if (contentLength) {
                    responseHeaders.set("Content-Length", contentLength);
                }

                return new NextResponse(response.body, {
                    status: 200,
                    headers: responseHeaders,
                });
            } else {
                const errorText = await response.text();
                console.error(`[StreamAPI] External API error: ${response.status} - ${errorText}`);
            }
        } catch (extError: any) {
            console.error("[StreamAPI] External API exception:", extError.message);
        }

        // Fallback to Internal Proxy
        const rangeHeader = request.headers.get("range");
        const headers: Record<string, string> = {};
        if (rangeHeader) {
            headers["Range"] = rangeHeader;
        }

        const proxyResponse = await getProxyStream(videoId, headers);

        if (!proxyResponse || !proxyResponse.ok) {
            console.error(`[StreamAPI] Internal proxy failed: ${proxyResponse?.status} ${proxyResponse?.statusText}`);
            return NextResponse.json(
                { success: false, error: `Stream failed: ${proxyResponse?.statusText || 'Unknown error'}` },
                { status: proxyResponse?.status || 500 }
            );
        }

        const responseHeaders = new Headers();
        responseHeaders.set("Content-Type", proxyResponse.headers.get("Content-Type") || "audio/mp4");
        responseHeaders.set("Access-Control-Allow-Origin", "*");

        const contentLength = proxyResponse.headers.get("Content-Length");
        if (contentLength) responseHeaders.set("Content-Length", contentLength);

        const contentRange = proxyResponse.headers.get("Content-Range");
        if (contentRange) responseHeaders.set("Content-Range", contentRange);

        return new NextResponse(proxyResponse.body, {
            status: proxyResponse.status,
            headers: responseHeaders,
        });

    } catch (error: any) {
        console.error("[StreamAPI] Fatal error:", error.message, error.stack);
        return NextResponse.json(
            { success: false, error: `Stream error: ${error.message}` },
            { status: 500 }
        );
    }
}
