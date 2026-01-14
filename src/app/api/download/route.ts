import { NextRequest, NextResponse } from "next/server";
import { getProxyStream } from "@/lib/youtube-music";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const videoId = searchParams.get("id");
        const title = searchParams.get("title") || "song";

        if (!videoId) {
            return NextResponse.json(
                { success: false, error: "Video ID is required" },
                { status: 400 }
            );
        }

        const externalApiUrl = "https://api.yuzone.me/download";

        // 1. Try External API
        try {
            const response = await fetch(externalApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoId, format: "mp3" }),
            });

            if (response.ok) {
                const contentType = response.headers.get("Content-Type") || "audio/mpeg";
                const headers = new Headers();
                headers.set("Content-Type", contentType);
                headers.set("Content-Disposition", `attachment; filename="${title}.mp3"`);

                return new NextResponse(response.body, { status: 200, headers });
            }
        } catch (e) {
            console.warn("External Download API failed, falling back...");
        }

        // 2. Fallback to Internal Proxy
        const proxyResponse = await getProxyStream(videoId);

        if (!proxyResponse || !proxyResponse.body) {
            return NextResponse.json({ error: "Download failed" }, { status: 500 });
        }

        const headers = new Headers();
        headers.set("Content-Type", "audio/mpeg");
        headers.set("Content-Disposition", `attachment; filename="${title}.mp3"`);

        return new NextResponse(proxyResponse.body, {
            status: 200,
            headers
        });

    } catch (error) {
        console.error("Download API error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
