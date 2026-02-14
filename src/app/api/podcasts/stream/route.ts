import { NextRequest, NextResponse } from "next/server";

function isAllowedUrl(url: string) {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const audioUrl = searchParams.get("url");

        if (!audioUrl || !isAllowedUrl(audioUrl)) {
            return NextResponse.json(
                { success: false, error: "Valid audio URL is required" },
                { status: 400 }
            );
        }

        const rangeHeader = request.headers.get("range");
        const headers: Record<string, string> = {};
        if (rangeHeader) {
            headers.Range = rangeHeader;
        }

        const response = await fetch(audioUrl, { headers, cache: "no-store" });
        if (!response.ok || !response.body) {
            return NextResponse.json(
                { success: false, error: "Failed to fetch podcast audio" },
                { status: response.status || 500 }
            );
        }

        const responseHeaders = new Headers();
        responseHeaders.set("Content-Type", response.headers.get("Content-Type") || "audio/mpeg");
        responseHeaders.set("Accept-Ranges", "bytes");
        responseHeaders.set("Cache-Control", "no-cache, must-revalidate");

        const contentLength = response.headers.get("Content-Length");
        if (contentLength) {
            responseHeaders.set("Content-Length", contentLength);
        }

        const contentRange = response.headers.get("Content-Range");
        if (contentRange) {
            responseHeaders.set("Content-Range", contentRange);
        }

        return new NextResponse(response.body, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (error: any) {
        console.error("Podcast stream error:", error);
        return NextResponse.json(
            { success: false, error: "Podcast stream error" },
            { status: 500 }
        );
    }
}
