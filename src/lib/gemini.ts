import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface UserMusicProfile {
    topArtists: string[];
    topGenres: string[];
    likedSongs: Array<{ title: string; artist: string }>;
    recentlyPlayed: Array<{ title: string; artist: string }>;
    listeningPatterns: {
        timeOfDay?: string;
        frequency?: number;
        diversity?: number;
    };
}

interface AIRecommendationRequest {
    userProfile: UserMusicProfile;
    availableSongs: Array<{ videoId: string; title: string; artist: string; genre?: string }>;
    contextMessage?: string;
}

interface AIRecommendationResponse {
    recommendations: Array<{
        videoId: string;
        title: string;
        artist: string;
        reason: string;
        relevanceScore: number;
        category: "discovery" | "similar" | "trending" | "mood";
    }>;
    insights: {
        userMusicTaste: string;
        recommendationStrategy: string;
        diversityScore: number;
    };
}

/**
 * Generate AI-powered music recommendations using Google Gemini
 */
export async function generateAIRecommendations(
    request: AIRecommendationRequest
): Promise<AIRecommendationResponse> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Build a rich prompt for Gemini
        const prompt = buildRecommendationPrompt(request);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the AI response
        return parseAIResponse(text, request.availableSongs);
    } catch (error) {
        console.error("Gemini AI recommendation error:", error);
        // Fallback to basic recommendations if AI fails
        return generateFallbackRecommendations(request);
    }
}

/**
 * Build a comprehensive prompt for Gemini AI
 */
function buildRecommendationPrompt(request: AIRecommendationRequest): string {
    const { userProfile, availableSongs, contextMessage } = request;

    const songList = availableSongs
        .slice(0, 100) // Limit to prevent token overflow
        .map((song, idx) => `${idx + 1}. "${song.title}" by ${song.artist} (ID: ${song.videoId})`)
        .join("\n");

    const likedSongsList = userProfile.likedSongs
        .slice(0, 20)
        .map((song) => `"${song.title}" by ${song.artist}`)
        .join(", ");

    const recentSongsList = userProfile.recentlyPlayed
        .slice(0, 15)
        .map((song) => `"${song.title}" by ${song.artist}`)
        .join(", ");

    return `You are a sophisticated music recommendation AI assistant for Yuzone Music, a streaming platform.

**User's Music Profile:**
- Top Artists: ${userProfile.topArtists.join(", ")}
- Top Genres: ${userProfile.topGenres.length > 0 ? userProfile.topGenres.join(", ") : "Not yet determined"}
- Recently Liked Songs: ${likedSongsList || "None yet"}
- Recently Played: ${recentSongsList || "None yet"}
- Listening Diversity: ${userProfile.listeningPatterns.diversity || "Medium"}

${contextMessage ? `**Context:** ${contextMessage}` : ""}

**Available Songs to Recommend From:**
${songList}

**Your Task:**
Analyze the user's music taste and recommend 30-40 songs from the available list that would best match their preferences. Consider:
1. Artist similarity and genre overlap
2. Musical mood and tempo patterns
3. Discovery potential (balance familiarity with new artists)
4. Listening context and time patterns
5. Diversity to avoid recommendation fatigue

**Output Format (JSON only, no markdown):**
{
  "recommendations": [
    {
      "videoId": "song_video_id",
      "reason": "Brief personalized reason (15-25 words)",
      "relevanceScore": 0.95,
      "category": "similar"
    }
  ],
  "insights": {
    "userMusicTaste": "2-3 sentence analysis of user's taste",
    "recommendationStrategy": "Brief explanation of recommendation approach",
    "diversityScore": 0.75
  }
}

**Categories:**
- "discovery": New artists/genres for exploration
- "similar": Songs matching their known preferences
- "trending": Popular songs aligned with their taste
- "mood": Songs matching their listening patterns

Provide exactly 35 recommendations. Prioritize quality and personalization over quantity. Return only valid JSON.`;
}

/**
 * Parse AI response into structured recommendations
 */
function parseAIResponse(
    aiText: string,
    availableSongs: Array<{ videoId: string; title: string; artist: string }>
): AIRecommendationResponse {
    try {
        // Clean up the response (remove markdown code blocks if present)
        let cleanText = aiText.trim();
        if (cleanText.startsWith("```json")) {
            cleanText = cleanText.replace(/^```json\s*/, "").replace(/```\s*$/, "");
        } else if (cleanText.startsWith("```")) {
            cleanText = cleanText.replace(/^```\s*/, "").replace(/```\s*$/, "");
        }

        const parsed = JSON.parse(cleanText);

        // Map videoIds to full song data
        const songMap = new Map(availableSongs.map((song) => [song.videoId, song]));
        
        const recommendations = parsed.recommendations
            .filter((rec: any) => songMap.has(rec.videoId))
            .map((rec: any) => {
                const song = songMap.get(rec.videoId)!;
                return {
                    videoId: rec.videoId,
                    title: song.title,
                    artist: song.artist,
                    reason: rec.reason || "Recommended for you",
                    relevanceScore: rec.relevanceScore || 0.8,
                    category: rec.category || "similar",
                };
            });

        return {
            recommendations,
            insights: {
                userMusicTaste: parsed.insights?.userMusicTaste || "Your music taste is evolving",
                recommendationStrategy: parsed.insights?.recommendationStrategy || "Based on your listening history",
                diversityScore: parsed.insights?.diversityScore || 0.7,
            },
        };
    } catch (error) {
        console.error("Failed to parse AI response:", error);
        console.error("AI Response:", aiText);
        throw error;
    }
}

/**
 * Generate fallback recommendations if AI fails
 */
function generateFallbackRecommendations(
    request: AIRecommendationRequest
): AIRecommendationResponse {
    const { availableSongs, userProfile } = request;

    // Simple score-based recommendation
    const scored = availableSongs.map((song) => {
        let score = 0.5; // base score

        // Boost if artist matches top artists
        if (userProfile.topArtists.some((artist) => song.artist.toLowerCase().includes(artist.toLowerCase()))) {
            score += 0.3;
        }

        // Boost if similar to liked songs
        if (userProfile.likedSongs.some((liked) => liked.artist.toLowerCase() === song.artist.toLowerCase())) {
            score += 0.2;
        }

        return {
            ...song,
            reason: "Recommended based on your listening history",
            relevanceScore: Math.min(score, 1),
            category: "similar" as const,
        };
    });

    // Sort by score and take top 35
    const recommendations = scored
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 35);

    return {
        recommendations,
        insights: {
            userMusicTaste: "Building your music profile...",
            recommendationStrategy: "Using collaborative filtering and artist similarity",
            diversityScore: 0.6,
        },
    };
}

/**
 * Analyze user's music taste using AI
 */
export async function analyzeUserMusicTaste(userProfile: UserMusicProfile): Promise<{
    genres: string[];
    mood: string;
    era: string;
    characteristics: string[];
}> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const likedSongs = userProfile.likedSongs
            .slice(0, 30)
            .map((song) => `"${song.title}" by ${song.artist}`)
            .join(", ");

        const prompt = `Analyze this user's music taste based on their listening history:

**Top Artists:** ${userProfile.topArtists.join(", ")}
**Liked Songs:** ${likedSongs}

Provide a detailed analysis in JSON format:
{
  "genres": ["genre1", "genre2", "genre3"],
  "mood": "overall mood (e.g., energetic, chill, melancholic)",
  "era": "predominant era (e.g., modern, 2000s, classic)",
  "characteristics": ["characteristic1", "characteristic2", "characteristic3"]
}

Return only valid JSON, no markdown.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Clean markdown if present
        if (text.startsWith("```json")) {
            text = text.replace(/^```json\s*/, "").replace(/```\s*$/, "");
        } else if (text.startsWith("```")) {
            text = text.replace(/^```\s*/, "").replace(/```\s*$/, "");
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Failed to analyze user taste:", error);
        return {
            genres: ["Various"],
            mood: "Eclectic",
            era: "Mixed",
            characteristics: ["Diverse", "Exploratory"],
        };
    }
}

/**
 * Generate personalized playlist name using AI
 */
export async function generatePlaylistName(songs: Array<{ title: string; artist: string }>): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const songList = songs
            .slice(0, 10)
            .map((song) => `"${song.title}" by ${song.artist}`)
            .join(", ");

        const prompt = `Generate a creative, catchy playlist name for a collection of these songs:
${songList}

Requirements:
- Short (2-4 words)
- Memorable and descriptive
- Reflects the mood/genre
- No generic names like "My Playlist"

Return only the playlist name, nothing else.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const name = response.text().trim().replace(/['"]/g, "");

        return name || "My Playlist";
    } catch (error) {
        console.error("Failed to generate playlist name:", error);
        return "My Playlist";
    }
}
