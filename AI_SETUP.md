# AI Recommendations Setup Guide

## Overview

Yuzone Music uses Google's Gemini AI to power intelligent music recommendations. This guide will help you set up and configure the AI features.

## Quick Setup

### 1. Install Dependencies

The necessary package is already installed:

```bash
npm install @google/generative-ai
```

### 2. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"** or **"Get API Key"**
4. Copy the generated API key

### 3. Configure Environment Variables

Create or edit `.env.local` in your project root:

```env
# Google Gemini AI
GEMINI_API_KEY=your_actual_api_key_here

# Other required variables
MONGODB_URI=your_mongodb_uri
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. Restart Your Development Server

```bash
npm run dev
```

## How It Works

### AI-Enhanced Recommendation Flow

1. **User Profile Analysis**

   - Analyzes listening history (last 100 plays)
   - Reviews liked songs (top 50)
   - Identifies top artists and genres
   - Calculates listening diversity score

2. **Candidate Generation**

   - Collects songs from multiple sources:
     - Songs from favorite artists
     - Similar tracks to liked songs
     - Trending songs for discovery
   - Typically generates 100-200 candidate songs

3. **AI Evaluation** (when `GEMINI_API_KEY` is set)

   - Sends user profile and candidates to Gemini
   - AI analyzes musical patterns and preferences
   - Generates personalized reasons for each recommendation
   - Assigns relevance scores (0.0 to 1.0)
   - Ensures diversity in recommendations

4. **Smart Blending**
   - Combines AI scores with algorithmic scores
   - Balances familiar favorites with discoveries
   - Groups recommendations by category:
     - **Songs You Might Like** (24 tracks)
     - **Artists You Might Like** (20 tracks)
     - **Based on Recent** (14 tracks)
     - **Trending in Your Style** (12 tracks)
     - **Fresh Discoveries** (20 tracks)

## Features

### Personalized Reasons

Each recommendation includes an AI-generated explanation:

- "Similar to your favorite tracks by [Artist]"
- "Matches your taste for energetic indie rock"
- "Popular among listeners who enjoy [Genre]"

### Continuous Learning

The system improves over time:

- More listening history = better recommendations
- Liked songs have higher weight
- Recent plays influence current suggestions

### Fallback Mode

Without the API key, the system uses a sophisticated algorithm:

- Artist similarity scoring
- Collaborative filtering
- Recency decay functions
- Genre-based matching

## API Usage & Costs

### Gemini API Pricing (as of 2024)

- **Gemini 1.5 Flash** (used by default)
  - Input: $0.075 per 1M tokens
  - Output: $0.30 per 1M tokens
- Generous free tier available
- Very cost-effective for music recommendations

### Typical Usage Per Request

- Input: ~2,000-4,000 tokens
- Output: ~500-1,000 tokens
- Cost per recommendation request: < $0.001

### Rate Limits

- Free tier: 15 requests per minute
- Paid tier: 1,000 requests per minute
- Perfect for most music apps

## Troubleshooting

### "AI enhancement failed" in logs

- **Cause:** Invalid or missing API key
- **Solution:** Double-check your `GEMINI_API_KEY` in `.env.local`

### Recommendations seem generic

- **Cause:** Limited listening history
- **Solution:** Listen to more songs and like your favorites. AI needs data to learn your taste.

### Slow recommendation loading

- **Cause:** AI processing takes 2-5 seconds
- **Solution:** This is normal. The system caches results and shows progress indicators.

### API quota exceeded

- **Cause:** Too many requests
- **Solution:**
  - Upgrade to paid tier
  - Implement caching (recommendations are cached per user)
  - Reduce refresh frequency

## Advanced Configuration

### Adjusting AI Parameters

Edit `/src/lib/gemini.ts` to customize:

```typescript
// Change AI model
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro", // More powerful but slower
});

// Adjust recommendation count
("Provide exactly 35 recommendations"); // Change to 20, 50, etc.

// Modify temperature (creativity)
model.generateContent(prompt, {
  temperature: 0.9, // 0.7 = balanced, 1.0 = more creative
});
```

### Customizing Prompts

The AI prompt includes:

- User's top artists
- Top genres
- Recent liked songs
- Listening patterns
- Available song pool

Modify the prompt in `buildRecommendationPrompt()` to emphasize different aspects.

## Best Practices

1. **Always have a fallback:** The system works without AI but is enhanced with it
2. **Cache recommendations:** Don't call AI on every page load
3. **Rate limit users:** Prevent API abuse
4. **Monitor costs:** Track API usage in Google Cloud Console
5. **Gather feedback:** Let users like/dislike recommendations to improve

## Security Notes

- ✅ API key is stored server-side only (`.env.local`)
- ✅ Never exposed to client-side JavaScript
- ✅ User data is not stored by Google
- ✅ All AI calls happen in API routes (`/api/recommendations`)

## Support

For issues or questions:

- Check the [Gemini API documentation](https://ai.google.dev/docs)
- Review logs in browser console and server terminal
- Ensure all dependencies are installed
- Verify environment variables are set correctly

---

Happy listening! 🎵✨
