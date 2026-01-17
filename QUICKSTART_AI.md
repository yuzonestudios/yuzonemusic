# 🚀 Quick Start: AI-Powered Recommendations

## Step 1: Get Your API Key (2 minutes)

1. Go to **[Google AI Studio](https://makersuite.google.com/app/apikey)**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIza...`)

## Step 2: Add to Environment (1 minute)

Create/edit `.env.local` in project root:

```env
GEMINI_API_KEY=AIzaSyC_your_actual_key_here
```

## Step 3: Restart Server (30 seconds)

```bash
npm run dev
```

## Step 4: Test It Out! 🎵

1. Open **http://localhost:3000**
2. Go to **"For You"** page
3. Look for:
   - ✨ "🤖 Enhancing recommendations with Gemini AI..." in console
   - Personalized reasons for each song
   - Better-matched song suggestions

---

## What You'll See

### Without API Key ⚡

```
Standard Recommendations
├─ Based on listening history
├─ Artist similarity matching
├─ Generic reasons
└─ Still pretty good!
```

### With API Key 🤖✨

```
AI-Powered Recommendations
├─ Analyzes your music taste deeply
├─ Custom reasons for each song
├─ Better discovery of new artists
├─ Context-aware suggestions
└─ Continuously learns!
```

---

## Example Recommendations

### Standard Algorithm

> **"Blinding Lights"** by The Weeknd
>
> Reason: _"Trending in your style"_

### With Gemini AI

> **"Blinding Lights"** by The Weeknd
>
> Reason: _"Matches your love for energetic synthpop. Similar production style to Dua Lipa tracks you've been enjoying lately."_

---

## Troubleshooting

### ❌ "AI enhancement failed"

**Fix:** Check your API key in `.env.local`

### ❌ Recommendations seem generic

**Fix:** Listen to more songs and like your favorites

### ❌ Slow loading

**Normal:** AI takes 2-5 seconds (shows progress)

---

## Cost? Almost Free! 💰

- **Free tier:** 15 requests/minute
- **Cost:** < $0.001 per recommendation
- **Monthly:** Even with 1000 users, < $10/month

---

## Need Help?

Check these files:

- `AI_SETUP.md` - Full setup guide
- `README.md` - Feature overview
- `IMPLEMENTATION_SUMMARY.md` - Technical details

Or open the browser console to see what's happening!

---

**Enjoy your AI-powered music discovery! 🎵✨**
