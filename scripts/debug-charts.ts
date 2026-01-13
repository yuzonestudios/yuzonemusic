
import { Innertube } from "youtubei.js";

async function debugCharts() {
    try {
        const yt = await Innertube.create({
            lang: "en",
            location: "US",
            retrieve_player: true,
        });

        console.log("Searching for Top 100 Songs Global playlist...");
        const results = await yt.music.search("Top 100 Songs Global", { type: "playlist" });

        if (results.playlists && results.playlists.contents && results.playlists.contents.length > 0) {
            const firstPlaylist = results.playlists.contents[0] as any;
            console.log(`Found playlist: ${firstPlaylist.title} (${firstPlaylist.id})`);

            if (firstPlaylist.id) {
                const playlist = await yt.music.getPlaylist(firstPlaylist.id);
                console.log(`Playlist items found: ${playlist.items?.length || 0}`);

                if (playlist.items && playlist.items.length > 0) {
                    const firstItem = playlist.items[0];
                    console.log("First Item Structure:");
                    console.log(JSON.stringify(firstItem, null, 2));

                    // Specific check for artists
                    // @ts-ignore
                    console.log("Artists property:", firstItem.artists);
                    // @ts-ignore
                    console.log("Author property:", firstItem.author);
                    // @ts-ignore
                    console.log("Subtitle property:", firstItem.subtitle);
                    // @ts-ignore
                    console.log("Flex columns:", JSON.stringify(firstItem.flex_columns, null, 2));
                }
            }
        } else {
            console.log("No playlists found");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

debugCharts();
