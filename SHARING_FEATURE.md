# Sharing Feature Documentation

## Overview

The sharing feature allows users to generate shareable links for their playlists and liked songs. Recipients can view the shared content without needing to log in to the application.

## Features

- **Generate Share Links**: Create unique, shareable links for any playlist or song
- **Expiration Control**: Set optional expiration times for shares (never expires, 1 hour, 1 day, 1 week, 30 days)
- **View Tracking**: Track how many times a shared link has been accessed
- **Public Access**: Recipients don't need to log in to view shared content
- **Settings Integration**: Easy access to sharing options from the Settings page

## Database

### Share Model (`src/models/Share.ts`)

Stores information about all created shares:

```typescript
interface IShare extends Document {
  userId: mongoose.Types.ObjectId; // User who created the share
  contentType: "playlist" | "song"; // Type of shared content
  contentId: string; // ID of the playlist or video
  shareToken: string; // Unique token for the share link
  expiresAt?: Date; // Optional expiration date
  viewCount: number; // Number of times accessed
  createdAt: Date;
  updatedAt: Date;
}
```

## API Routes

### 1. Generate Share Link

**Endpoint**: `POST /api/share/generate`

**Request**:

```json
{
    "contentType": "playlist" | "song",
    "contentId": "string",
    "expiresIn": 3600  // Optional, seconds
}
```

**Response**:

```json
{
    "success": true,
    "share": {
        "_id": "string",
        "shareToken": "string",
        "contentType": "playlist" | "song",
        "contentId": "string",
        "shareUrl": "http://localhost:3000/share/{token}",
        "viewCount": 0,
        "createdAt": "2026-01-15T00:00:00.000Z"
    }
}
```

**Notes**:

- Requires authentication
- Returns existing share if one already exists for the same content
- `expiresIn` is in seconds

### 2. Access Shared Content

**Endpoint**: `GET /api/share/{token}`

**Response (Playlist)**:

```json
{
  "success": true,
  "content": {
    "type": "playlist",
    "data": {
      "_id": "string",
      "name": "Playlist Name",
      "description": "Optional description",
      "thumbnail": "url",
      "songs": [
        {
          "videoId": "string",
          "title": "Song Title",
          "artist": "Artist Name",
          "thumbnail": "url",
          "duration": "3:45",
          "addedAt": "2026-01-15T00:00:00.000Z"
        }
      ],
      "songCount": 10,
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "2026-01-15T00:00:00.000Z"
    }
  },
  "viewCount": 5
}
```

**Error Cases**:

- `404`: Share not found or expired
- `410`: Share link has expired (if expiration date is in the past)

**Notes**:

- No authentication required
- Increments view count on each access
- Returns 410 (Gone) status if share has expired

## Frontend Components

### ShareModal (`src/components/ui/ShareModal.tsx`)

Modal component for generating and displaying share links.

**Props**:

```typescript
interface ShareModalProps {
  contentType: "playlist" | "song";
  contentId: string;
  contentName: string;
  onClose: () => void;
}
```

**Features**:

- Generate new share links
- Set expiration time
- Copy share URL to clipboard
- Display success/error messages

### Share Page (`src/app/share/[token]/page.tsx`)

Public page for viewing shared playlists.

**Features**:

- Display playlist information
- Show all songs in playlist
- Display song metadata (title, artist, thumbnail, duration)
- View count tracking
- Responsive design
- Error handling for expired/invalid links

## Settings Integration

The Settings page (`src/app/(app)/settings/page.tsx`) includes a "Share" section that allows users to:

1. **View all playlists** and generate share links
2. **View liked songs** (first 5) and generate share links
3. **See share statistics** like song count

## Usage

### For Users

1. Navigate to Settings page
2. Scroll to "Share" section
3. Click "Share" button on any playlist or song
4. (Optional) Select expiration time
5. Click "Generate Share Link"
6. Copy the link and share it with others

### For Developers

**Generate a share link programmatically**:

```typescript
const response = await fetch("/api/share/generate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    contentType: "playlist",
    contentId: "playlistId123",
    expiresIn: 604800, // 1 week in seconds
  }),
});

const data = await response.json();
console.log(data.share.shareUrl); // Use this URL
```

**Access shared content**:

```typescript
const response = await fetch("/api/share/abc123def456");
const data = await response.json();

if (data.success) {
  console.log(data.content.data); // Playlist/song data
}
```

## Environment Variables

Add to your `.env.local`:

```bash
# Optional: Set your app URL for share links (defaults to http://localhost:3000)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Security Considerations

1. **Share Tokens**: 16-byte random hex strings (128 bits) provide strong collision resistance
2. **No User Identification**: Share links don't reveal user identity
3. **View-Only Access**: Shared content cannot be modified without authentication
4. **Expiration Support**: Links can expire automatically
5. **Content Protection**: Only playlist owners can see their own view statistics

## Future Enhancements

- [ ] Share with specific users (require email)
- [ ] Password-protected shares
- [ ] Download shared playlists
- [ ] Share individual songs with metadata
- [ ] Analytics dashboard for shared content
- [ ] Revoke share links
- [ ] Bulk share management

## Troubleshooting

### Share link returns 404

- Token may be invalid
- Share may have been deleted
- Check if sharing was enabled in settings

### Share link shows "Expired"

- The link's expiration date has passed
- Share owner needs to generate a new link

### Views not updating

- Views are incremented each time the link is accessed
- Refresh the page to see updated view count
