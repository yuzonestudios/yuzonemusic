import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.error("[ClientError]", body);
    } catch (error) {
        console.error("[ClientError] Failed to parse error payload", error);
    }

    return NextResponse.json({ ok: true });
}
