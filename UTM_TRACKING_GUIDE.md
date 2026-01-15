# UTM Tracking & Viewership Analytics

## Overview

This system automatically tracks UTM (Urchin Tracking Module) parameters and provides comprehensive viewership analytics for Yuzone Music. It includes:

- **Automatic UTM Parameter Tracking**: Captures all UTM parameters from URLs
- **Session Tracking**: Unique session identification across visits
- **Device Detection**: Automatic detection of device type, browser, and OS
- **Analytics Dashboard**: Comprehensive dashboard to view analytics
- **Auto Data Retention**: Data automatically deleted after 90 days to manage storage
- **Real-time Updates**: Analytics data processed immediately upon visit

## Features

### 1. UTM Parameters Tracked

- `utm_source`: Where the traffic came from (e.g., google, facebook, twitter)
- `utm_medium`: Channel type (e.g., cpc, social, email, organic)
- `utm_campaign`: Campaign name
- `utm_content`: Specific content/ad variant
- `utm_term`: Search keywords

### 2. Additional Metrics

- Session ID (unique per user per session)
- Page visited
- Referrer information
- User Agent data
- Device type (mobile, tablet, desktop)
- Browser information (Chrome, Safari, Firefox, etc.)
- Operating System (Windows, macOS, iOS, Android, etc.)
- Timezone
- IP Address (for geographic analysis)
- User identification (if logged in)

### 3. Analytics Data Available

- Total visits count
- Unique users count
- Unique sessions count
- UTM source breakdown by source, medium, and campaign
- Top pages visited
- Device distribution
- Browser distribution

## Database Structure

### UTMTracking Collection

```typescript
{
  userId?: string;              // Email of authenticated user
  sessionId: string;            // Unique session identifier
  source?: string;              // UTM source
  medium?: string;              // UTM medium
  campaign?: string;            // UTM campaign
  content?: string;             // UTM content
  term?: string;                // UTM term
  page: string;                 // Page path (e.g., /dashboard)
  referrer?: string;            // HTTP referrer
  userAgent?: string;           // Browser user agent
  ipAddress?: string;           // Client IP
  timestamp: Date;              // Visit timestamp
  timezone?: string;            // User timezone
  device?: string;              // mobile | tablet | desktop
  browser?: string;             // Browser name
  os?: string;                  // Operating system
}
```

**Indexes:**

- Single field: `sessionId`, `source`, `medium`, `campaign`, `page`, `ipAddress`
- Compound: `timestamp + source`, `timestamp + medium`, `timestamp + campaign`
- TTL: Automatic deletion after 90 days

## Usage

### Client-Side Tracking Hook

The `useUTMTracking` hook is automatically integrated into the app via the `UTMTracker` component in providers.tsx.

**Manual Usage (if needed):**

```tsx
import { useUTMTracking } from "@/hooks/useUTMTracking";

export default function MyComponent() {
  useUTMTracking(); // Automatically tracks UTM params
  return <div>...</div>;
}
```

### Sharing Links with UTM Parameters

Example URLs to share:

```
https://yuzonemusic.com/dashboard?utm_source=twitter&utm_medium=social&utm_campaign=summer_2024
https://yuzonemusic.com/top?utm_source=facebook&utm_medium=cpc&utm_campaign=awareness
https://yuzonemusic.com/playlists?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_picks
```

### Analytics Dashboard

Access the analytics dashboard at `/analytics` (requires login):

1. **View Analytics**: Navigate to Settings → View Analytics Dashboard
2. **Time Range Filter**: Select 24 hours, 7 days, 30 days, or 90 days
3. **Source Filter**: Filter by specific UTM source
4. **Metrics Displayed**:
   - Total visits
   - Unique users
   - Unique sessions
   - UTM performance breakdown
   - Top pages
   - Device breakdown
   - Browser distribution

## API Routes

### POST /api/analytics

Track a page view with UTM parameters.

**Request:**

```json
{
  "sessionId": "string (required)",
  "utm_source": "string",
  "utm_medium": "string",
  "utm_campaign": "string",
  "utm_content": "string",
  "utm_term": "string",
  "page": "string (required)",
  "referrer": "string",
  "userAgent": "string",
  "timezone": "string",
  "device": "mobile|tablet|desktop",
  "browser": "string",
  "os": "string",
  "userId": "string"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Tracking data recorded successfully",
  "trackingId": "mongo_id"
}
```

### GET /api/analytics

Retrieve analytics data.

**Query Parameters:**

- `days` (optional): Number of days to look back (default: 7)
- `source` (optional): Filter by specific UTM source

**Response:**

```json
{
  "success": true,
  "data": {
    "analytics": [
      {
        "_id": {
          "source": "google",
          "medium": "organic",
          "campaign": null
        },
        "count": 150,
        "uniqueUsers": 45,
        "uniqueSessions": 80
      }
    ],
    "deviceBreakdown": [
      {
        "_id": "mobile",
        "count": 200
      }
    ],
    "topPages": [
      {
        "_id": "/dashboard",
        "count": 250
      }
    ],
    "browserBreakdown": [
      {
        "_id": "Chrome",
        "count": 400
      }
    ],
    "timeRange": {
      "start": "2024-01-08T00:00:00.000Z",
      "end": "2024-01-15T00:00:00.000Z",
      "days": 7
    }
  }
}
```

## Implementation Details

### Session Management

- Session ID is generated on first visit and stored in localStorage
- Format: `session_{timestamp}_{random}`
- Persists across page navigations and page reloads
- Clears when browser localStorage is cleared

### Device Detection

- **Mobile**: Includes iPhone, iPad, Android phones
- **Tablet**: iPad, Android tablets
- **Desktop**: Windows, macOS, Linux desktops

### Browser Detection

Supports: Chrome, Safari, Firefox, Edge, Opera

### Automatic Features

✅ Tracks every page navigation
✅ Captures browser and OS automatically
✅ Generates unique session IDs
✅ Records timezone information
✅ Silently fails if tracking service unavailable (non-blocking)
✅ Respects user privacy (no PII except logged-in user email)

## Privacy & Data Retention

- **Data Retention**: 90 days (automatic TTL)
- **PII**: Only captures email of logged-in users
- **User Control**: Users can view their own analytics
- **No Third-party Sharing**: All data stays within your infrastructure
- **GDPR Compliance**: Respects user privacy; can be extended with consent management

## Performance Considerations

- ✅ Non-blocking: Tracking doesn't impact user experience
- ✅ Batch Aggregation: MongoDB aggregation pipeline used for analytics
- ✅ Indexed Queries: Compound indexes for fast querying
- ✅ Auto-cleanup: TTL index removes old data automatically

## Future Enhancements

Possible extensions:

- Conversion tracking (e.g., playlist creation, songs added)
- Goal funnels (multi-step user journeys)
- Real-time dashboards with WebSocket updates
- Custom event tracking
- A/B testing integration
- Geographic heatmaps
- Cohort analysis
- Retention metrics

## Troubleshooting

### No data showing in analytics?

1. Check browser console for errors
2. Verify `/api/analytics` endpoint is working
3. Ensure you're visiting URLs with UTM parameters
4. Check MongoDB connection

### Tracking not working?

1. Verify `useUTMTracking` hook is called
2. Check that localStorage is enabled
3. Verify API endpoint is accessible
4. Check browser network tab for failed requests

### Session ID not persisting?

- localStorage might be disabled
- Private/Incognito mode doesn't persist localStorage
- Browser data might have been cleared

## Questions?

For support or feature requests, contact the development team or check the README.md in the project root.
