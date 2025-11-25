# MockingBird Frontend

React Native (Expo) mobile app for the Sarcasm Translator.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Update API URL in `src/constants/index.ts`:

```typescript
export const API_BASE_URL = __DEV__
  ? "http://localhost:3000" // Local development
  : "https://your-api.vercel.app"; // Production URL
```

3. Add placeholder images to `assets/` folder:

   - `icon.png` (1024x1024) - App icon
   - `splash.png` (1284x2778) - Splash screen
   - `adaptive-icon.png` (1024x1024) - Android adaptive icon
   - `favicon.png` (48x48) - Web favicon

4. Start the development server:

```bash
npm start
```

## Development Commands

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

## Project Structure

```
Frontend/
├── app/                    # Expo Router (file-based routing)
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Home screen route
│   └── history.tsx         # History screen route
│
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ModeSelector.tsx
│   │   └── OutputCard.tsx
│   │
│   ├── screens/            # Screen components
│   │   ├── HomeScreen.tsx
│   │   └── HistoryScreen.tsx
│   │
│   ├── services/           # External services
│   │   ├── api.ts          # Backend API calls
│   │   └── storage.ts      # AsyncStorage operations
│   │
│   ├── store/              # State management (Zustand)
│   │   └── index.ts
│   │
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   │
│   └── constants/          # App constants & theme
│       └── index.ts
│
├── assets/                 # Static assets (images, fonts)
├── app.json                # Expo configuration
├── package.json
└── tsconfig.json
```

## Features

- 🎨 Dark theme UI
- 📱 Cross-platform (iOS, Android, Web)
- 💾 Local history with AsyncStorage
- 🔄 API response caching with Zustand
- 📋 Copy to clipboard
- 📤 Native share functionality

## Building for Production

```bash
# Build for all platforms
npx expo build

# Build Android APK
npx eas build --platform android

# Build iOS app
npx eas build --platform ios
```
