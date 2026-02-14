import { NextResponse } from "next/server";

function removedResponse() {
    return NextResponse.json(
        { success: false, error: "Playback position sync has been removed." },
        { status: 410 }
    );
}

export async function GET() {
    return removedResponse();
}

export async function POST() {
    return removedResponse();
}

export async function DELETE() {
    return removedResponse();
}
