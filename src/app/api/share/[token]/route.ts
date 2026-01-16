import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Share from "@/models/Share";
import Playlist from "@/models/Playlist";
import { getSongInfo } from "@/lib/youtube-music";

// GET - Access shared content without authentication
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Share token is required" },
                { status: 400 }
            );
        }

        await connectDB();

        // Find share
        const share = await Share.findOne({ shareToken: token });

        if (!share) {
            return NextResponse.json(
                { success: false, error: "Share not found or expired" },
                { status: 404 }
            );
        }

        // Check if share has expired
        if (share.expiresAt && new Date() > share.expiresAt) {
            return NextResponse.json(
                { success: false, error: "Share link has expired" },
                { status: 410 }
            );
        }

        // Increment view count
        share.viewCount += 1;
        await share.save();

        // Get shared content
        if (share.contentType === "playlist") {
            const playlist = await Playlist.findById(share.contentId).lean();

            if (!playlist) {
                return NextResponse.json(
                    { success: false, error: "Playlist not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                content: {
                    type: "playlist",
                    data: {
                        _id: playlist._id.toString(),
                        name: playlist.name,
                        description: playlist.description,
                        thumbnail: playlist.thumbnail,
                        songs: playlist.songs,
                        songCount: playlist.songs.length,
                        createdAt: playlist.createdAt,
                        updatedAt: playlist.updatedAt,
                    },
                },
                viewCount: share.viewCount,
            });
        } else if (share.contentType === "song") {
            // Try to fetch song metadata using external API
            let songData = null;
            try {
                // Use external API to search for the song by videoId
                const externalApiUrl = `https://api.yuzone.me/search?q=${encodeURIComponent(share.contentId)}`;
                const response = await fetch(externalApiUrl, {
                    headers: {
                        'User-Agent': 'YuzoneMusic/1.0'
                    }
                });
                
                if (response.ok) {
                    const results = await response.json();
                    console.log("External API response for videoId:", results);
                    
                    // Find exact match by videoId
                    const match = results.find((song: any) => 
                        song.videoId === share.contentId || song.id === share.contentId
                    );
                    
                    if (match) {
                        songData = {
                            videoId: match.videoId || match.id,
                            title: match.title || "Unknown Title",
                            artist: Array.isArray(match.artists) 
                                ? match.artists.join(", ") 
                                : match.artist || match.artists || "Unknown Artist",
                            thumbnail: match.thumbnail || match.thumbnails?.[0]?.url || "/placeholder-album.png",
                            duration: match.duration || "",
                        };
                        console.log("Fetched song data from external API:", songData);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch song info from external API:", err);
            }

            // Fallback: try getSongInfo
            if (!songData) {
                try {
                    songData = await getSongInfo(share.contentId);
                    console.log("Fetched song data from getSongInfo:", songData);
                } catch (err) {
                    console.error("Failed to fetch song info from getSongInfo:", err);
                }
            }

            const responseData = songData || {
                videoId: share.contentId,
                title: "Unknown Title",
                artist: "Unknown Artist",
                thumbnail: "/placeholder-album.png",
                duration: "",
            };

            console.log("Returning song data:", responseData);

            return NextResponse.json({
                success: true,
                content: {
                    type: "song",
                    data: responseData,
                },
                viewCount: share.viewCount,
            });
        }

        return NextResponse.json(
            { success: false, error: "Invalid content type" },
            { status: 400 }
        );
    } catch (error) {
        console.error("Error accessing shared content:", error);
        return NextResponse.json(
            { success: false, error: "Failed to access shared content" },
            { status: 500 }
        );
    }
}
