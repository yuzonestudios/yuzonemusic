async function testStreamProxy() {
    try {
        const videoId = "J7p4bzqLvCw"; // Blinding Lights
        const url = `http://localhost:3000/api/stream?id=${videoId}`;

        console.log(`Fetching from proxy: ${url}`);

        const response = await fetch(url);

        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Content-Type: ${response.headers.get("content-type")}`);
        console.log(`Content-Length: ${response.headers.get("content-length")}`);

        if (response.ok && response.headers.get("content-type")?.includes("audio")) {
            console.log("✅ Proxy returned audio stream successfully!");
        } else {
            console.error("❌ Proxy failed to return audio.");
            const text = await response.text();
            console.error("Response:", text.substring(0, 200));
            process.exit(1);
        }

    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

testStreamProxy();
