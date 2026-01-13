import { getProxyStream } from "../src/lib/youtube-music";

async function debug() {
    console.log("Starting debug...");
    try {
        const videoId = "J7p4bzqLvCw";
        console.log(`Getting proxy stream for ${videoId}...`);

        const response = await getProxyStream(videoId);

        if (response) {
            console.log("✅ Got response!");
            console.log("Status:", response.status);
            console.log("Headers:", Object.fromEntries(response.headers.entries()));
        } else {
            console.error("❌ Response is null");
        }

    } catch (error) {
        console.error("❌ CRASH:", error);
    }
}

debug();
