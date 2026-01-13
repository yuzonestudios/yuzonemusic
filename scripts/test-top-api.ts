export async function testTopApi() {
    const url = "http://localhost:3000/api/top";
    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        console.log("Status:", res.status);
        if (res.ok) {
            const data = await res.json();
            console.log("Success:", data.success);
            if (data.songs) {
                console.log(`Got ${data.songs.length} songs.`);
                if (data.songs.length > 0) {
                    console.log("First song:", data.songs[0].title, "by", data.songs[0].artist);
                }
            } else {
                console.log("No songs returned?", data);
            }
        } else {
            console.log("Error body:", await res.text());
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

testTopApi();
