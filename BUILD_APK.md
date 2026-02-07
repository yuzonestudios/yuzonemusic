# Building Yuzone Music APK

## Prerequisites
1. Install Android Studio: https://developer.android.com/studio
2. Install Java JDK 17 or higher
3. Set ANDROID_HOME environment variable

## Steps to Build APK

### 1. Build the Next.js app
```bash
npm run build:apk
```

### 2. Open Android Studio
```bash
npm run android
```

### 3. Build APK in Android Studio
- Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
- APK will be in: `android/app/build/outputs/apk/debug/app-debug.apk`

### 4. Build Release APK (for production)
- Click **Build** → **Generate Signed Bundle / APK**
- Select **APK**
- Create or select keystore
- APK will be in: `android/app/build/outputs/apk/release/app-release.apk`

## Quick Commands
```bash
# Development build
npm run build:apk

# Open in Android Studio
npm run android

# Sync changes
npx cap sync android
```

## Important Notes
- Your app uses server-side features (API routes, auth) that won't work in static export
- Consider using the web app URL in a WebView instead, or migrate to a hybrid approach
- For full functionality, keep the backend hosted and use API calls from the app

## Alternative: WebView Wrapper
If you want to keep all features, wrap your website in a WebView:
1. Keep your website hosted at music.yuzone.me
2. The APK loads the URL in a native WebView
3. All features work as expected

To use WebView approach, update `capacitor.config.ts`:
```typescript
server: {
  url: 'https://music.yuzone.me',
  cleartext: true
}
```
