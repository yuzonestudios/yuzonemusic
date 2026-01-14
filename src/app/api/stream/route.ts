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

            // Forward user's Range header if present
            const rangeHeader = request.headers.get("range");
            const headers = new Headers({
                "Content-Type": "application/json",
            });
            if (rangeHeader) {
                headers.set("Range", rangeHeader);
            } else {
                // Optimization: If no range requested, still prefer partial content to allow seeking later? 
                // Actually, standard browsers send Range: bytes=0- initially.
            }

            // FORCE Range header for initial request to ensure server supports it?
            // Some servers return 200 OK for full file if Range=0-. 
            // We just pass through whatever the browser sent.

            const response = await fetch(externalApiUrl, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    videoId: videoId,
                    format: "mp3",
                }),
                // IMPORTANT: Don't let Next.js cache this fetch, as Ranges differ!
                cache: 'no-store'
            });

            if (response.ok || response.status === 206) {
                const contentType = response.headers.get("Content-Type") || "audio/mpeg";
                const contentLength = response.headers.get("Content-Length");
                const contentRange = response.headers.get("Content-Range");
                const acceptRanges = response.headers.get("Accept-Ranges");

                console.log(`[StreamAPI] External API success: ${response.status} ${contentType}`);

                const responseHeaders = new Headers();
                responseHeaders.set("Content-Type", contentType);
                responseHeaders.set("Cache-Control", "public, max-age=31536000");

                if (contentLength) responseHeaders.set("Content-Length", contentLength);
                if (contentRange) responseHeaders.set("Content-Range", contentRange);
                if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);

                return new NextResponse(response.body, {
                    status: response.status,
                    headers: responseHeaders,
                });
            }

            console.warn(`[StreamAPI] External API failed with status ${response.status}. Falling back to internal proxy.`);

            // Fallback to internal proxy
            const internalResponse = await getProxyStream(videoId);

            if (!internalResponse || !internalResponse.body) {
                console.error("[StreamAPI] Internal fallback failed to return a body");
                return NextResponse.json({ error: "Failed to get stream" }, { status: 500 });
            }

            console.log("[StreamAPI] Internal fallback success");

            return new NextResponse(internalResponse.body, {
                status: 200,
                headers: {
                    "Content-Type": "audio/mpeg",
                    "Cache-Control": "no-cache",
                },
            });
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
