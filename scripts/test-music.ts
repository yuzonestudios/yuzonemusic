import { searchSongs, getStreamUrl } from "../src/lib/youtube-music";

// Since we are running outside Next.js, we need to mock/polyfill if necessary, 
// but youtubei.js is isomorphic. However, we need to handle TS execution using ts-node or similar,
// or just use valid JS. But I'll write TS and let the user run it with ts-node or I'll just rely on `npx tsx`.

async function testYouTubeMusic() {
    console.log("🎵 Testing YouTube Music Search...");

    try {
        const query = "Blinding Lights";
        console.log(`Searching for: "${query}"`);

        const songs = await searchSongs(query, 5);

        if (songs.length === 0) {
            console.error("❌ No songs found!");
            process.exit(1);
        }

        console.log(`✅ Found ${songs.length} songs.`);
        console.log("First result:", songs[0]);

        const videoId = songs[0].videoId;
        console.log(`\n🎵 Testing Audio Stream Extraction for ID: ${videoId}...`);

        const streamUrl = await getStreamUrl(videoId);

        if (!streamUrl) {
            console.error("❌ Failed to get stream URL!");
            process.exit(1);
        }

        console.log("✅ Successfully extracted stream URL:", streamUrl.substring(0, 50) + "...");
        console.log("\n🎉 YouTube Music Integration verified successfully!");

    } catch (error) {
        console.error("❌ Test failed with error:", error);
        process.exit(1);
    }
}

testYouTubeMusic();
