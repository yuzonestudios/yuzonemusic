function getInitials(name?: string) {
    const trimmed = (name || "User").trim();
    if (!trimmed) return "U";
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return `${first}${last}`.toUpperCase();
}

export function getDefaultAvatarDataUrl(name?: string) {
    const initials = getInitials(name);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1877F2" />
      <stop offset="100%" stop-color="#0f5bd6" />
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="64" fill="url(#g)" />
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="48" font-family="Inter, Arial, sans-serif" fill="#ffffff" font-weight="700">${initials}</text>
</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getAvatarUrl(image?: string | null, name?: string | null) {
    if (image && image.trim().length > 0) {
        return image;
    }
    return getDefaultAvatarDataUrl(name || "User");
}
