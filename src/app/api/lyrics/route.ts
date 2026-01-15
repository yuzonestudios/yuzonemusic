export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId } = body;

        if (!videoId) {
            return Response.json(
                { error: "videoId is required" },
                { status: 400 }
            );
        }

        const response = await fetch("https://api.yuzone.me/lyrics", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ videoId }),
        });

        if (!response.ok) {
            return Response.json(
                { error: "Failed to fetch lyrics" },
                { status: response.status }
            );
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error("Lyrics API error:", error);
        return Response.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
