import { getTopCharts } from "../src/lib/youtube-music";

async function testLib() {
    console.log("Testing getTopCharts library function...");
    try {
        const songs = await getTopCharts();
        console.log("Success!");
        console.log(`Got ${songs.length} songs.`);
        if (songs.length > 0) {
            console.log("Sample:", songs[0]);
        }
    } catch (e) {
        console.error("Library Error:", e);
    }
}

testLib();
