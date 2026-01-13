export async function debugExternalApi() {
    const externalApiUrl = "https://yuzone-api.onrender.com/download";
    const videoId = "lOHVMmZ6n3o"; // Provided by user

    console.log(`Testing external API: ${externalApiUrl}`);
    try {
        const response = await fetch(externalApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                videoId: videoId,
                format: "mp3",
            }),
        });

        console.log("Status:", response.status);
        console.log("StatusText:", response.statusText);
        if (!response.ok) {
            const text = await response.text();
            console.log("Error Body:", text);
        } else {
            console.log("Response OK");
            console.log("Headers:", Object.fromEntries(response.headers.entries()));
        }

    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

debugExternalApi();
