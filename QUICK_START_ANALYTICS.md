# Quick Start: UTM Tracking & Analytics

## 🚀 Get Started in 3 Steps

### Step 1: Share Campaign Links

Add UTM parameters to any Yuzone Music URL:

```
Base URL: https://yuzonemusic.com/dashboard

With UTM Parameters:
https://yuzonemusic.com/dashboard?utm_source=twitter&utm_medium=social&utm_campaign=new_release
```

**Parameter Format:**

- `utm_source`: Where traffic comes from (required)
- `utm_medium`: Channel type (optional)
- `utm_campaign`: Campaign name (optional)
- `utm_content`: Content variant (optional)
- `utm_term`: Keywords (optional)

### Step 2: Track Visitors

Every visit is automatically tracked! No additional setup needed.

The system captures:

- ✅ UTM parameters
- ✅ Device type (mobile/tablet/desktop)
- ✅ Browser (Chrome, Safari, Firefox, etc.)
- ✅ Operating system
- ✅ Page visited
- ✅ Time and timezone
- ✅ User (if logged in)

### Step 3: View Analytics

**Access Analytics Dashboard:**

1. Login to Yuzone Music
2. Go to **Settings**
3. Click **View Analytics Dashboard** button
4. Or visit: `https://yuzonemusic.com/analytics`

---

## 📊 Dashboard Features

### Summary Cards

- **Total Visits**: All page views
- **Unique Users**: Individual visitors
- **Sessions**: User sessions

### Filters

- **Time Range**: 24h, 7d, 30d, 90d
- **Source Filter**: Filter by specific utm_source

### Reports

- **UTM Performance**: Breakdown by source/medium/campaign
- **Top Pages**: Most visited pages
- **Device Breakdown**: Mobile/tablet/desktop distribution
- **Browser Stats**: Browser and OS breakdown

---

## 🎯 Common Use Cases

### Example 1: Social Media Campaign

```
Campaign: Summer Music Festival 2024
URL: https://yuzonemusic.com/?utm_source=instagram&utm_medium=social&utm_campaign=summer_festival
Share on: Instagram, TikTok, Twitter, Facebook
Analytics: See which platform drives most traffic
```

### Example 2: Email Newsletter

```
Campaign: Weekly Top Picks
URL: https://yuzonemusic.com/top?utm_source=email&utm_medium=newsletter&utm_campaign=weekly_picks
Track: Which subscribers visit the site
Measure: Email engagement
```

### Example 3: A/B Test Campaign

```
Campaign A: https://yuzonemusic.com/?utm_source=google&utm_medium=cpc&utm_campaign=test&utm_content=ad_v1
Campaign B: https://yuzonemusic.com/?utm_source=google&utm_medium=cpc&utm_campaign=test&utm_content=ad_v2
Compare: Which ad version gets more traffic
```

### Example 4: Influencer Partnerships

```
Influencer: @musicblogger
URL: https://yuzonemusic.com/library?utm_source=musicblogger&utm_medium=referral&utm_campaign=influencer_collab
Track: Traffic from specific influencer
Measure: ROI of partnership
```

---

## 📈 Sample Analytics Report

When you visit the analytics dashboard, you'll see something like:

```
Summary:
  Total Visits: 1,234
  Unique Users: 567
  Sessions: 890

Top Sources:
  google organic: 450 visits, 234 users
  twitter social: 280 visits, 145 users
  email newsletter: 220 visits, 112 users
  facebook paid: 150 visits, 76 users

Top Pages:
  /dashboard: 500 visits
  /top: 320 visits
  /playlists: 250 visits
  /library: 164 visits

Devices:
  Mobile: 45% (556 visits)
  Desktop: 40% (494 visits)
  Tablet: 15% (184 visits)

Browsers:
  Chrome: 60%
  Safari: 25%
  Firefox: 10%
  Other: 5%
```

---

## 💡 Best Practices

### 1. Naming Conventions

```
✅ Good:  utm_source=twitter (lowercase, no spaces)
❌ Bad:   utm_source=Twitter or utm_source=my twitter account
```

### 2. Campaign Naming

```
✅ Good:  utm_campaign=summer-music-2024
❌ Bad:   utm_campaign=summer music 2024 or campaign_1
```

### 3. Consistent Medium Names

```
Use Standard Medium Names:
  - social (for social media)
  - email (for email campaigns)
  - cpc (for paid ads)
  - organic (for organic search)
  - referral (for referral traffic)
  - direct (for direct visits)
```

### 4. Document Your Campaigns

Keep a spreadsheet:

```
Campaign Name | Source | Medium | Campaign | URL | Start Date | End Date | Goal
Summer 2024   | twitter | social | summer-2024 | [URL] | 2024-01-15 | 2024-01-30 | 1000 visits
```

---

## 🔗 Quick URL Generator

**Build links easily:**

Base: `https://yuzonemusic.com/dashboard`

Add parameters:

```
?utm_source=CHANNEL&utm_medium=TYPE&utm_campaign=NAME&utm_content=VARIANT
```

**Examples:**

Twitter Social Campaign:

```
https://yuzonemusic.com/?utm_source=twitter&utm_medium=social&utm_campaign=new_release
```

Facebook Paid Ad:

```
https://yuzonemusic.com/?utm_source=facebook&utm_medium=paid_social&utm_campaign=awareness
```

Email Newsletter:

```
https://yuzonemusic.com/top?utm_source=email&utm_medium=newsletter&utm_campaign=weekly
```

Search Ad:

```
https://yuzonemusic.com/?utm_source=google&utm_medium=cpc&utm_campaign=branded
```

---

## 📱 Mobile Analytics

The analytics dashboard is fully responsive!

- **Mobile**: View analytics on your phone
- **Tablet**: Works perfectly on tablets
- **Desktop**: Full featured experience

---

## 🔐 Data Privacy

Your data is safe:

- ✅ All data stays within your infrastructure
- ✅ No third-party tracking or data sharing
- ✅ Automatic deletion after 90 days
- ✅ User email only stored for authenticated users
- ✅ GDPR compliant

---

## 📞 Common Questions

**Q: Where does tracking start?**
A: Immediately! Just add UTM parameters to any Yuzone Music URL and share.

**Q: Can I see real-time data?**
A: Yes! Data updates in real-time. Refresh the dashboard to see latest stats.

**Q: How long is data kept?**
A: 90 days. Older data automatically deletes to manage database size.

**Q: Can I export data?**
A: Currently view-only in dashboard. For exports, contact the development team.

**Q: Do I need to change any code?**
A: No! Tracking is automatic. Just add UTM parameters to URLs.

**Q: What if I don't use UTM parameters?**
A: System still tracks visits but without source/medium/campaign info. Add parameters to get full insights.

---

## 🎓 Learn More

For detailed technical information, see:

- `UTM_TRACKING_GUIDE.md` - Complete technical documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- Analytics Dashboard Help (in-app)

---

## 🚀 You're Ready!

1. ✅ System is running and tracking
2. ✅ Share campaign links with UTM parameters
3. ✅ Wait for visitors
4. ✅ Check analytics dashboard
5. ✅ Make data-driven decisions!

**Happy tracking!** 📊

---

**Last Updated**: January 15, 2026
**Status**: Production Ready ✅
