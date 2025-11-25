## 🐦 MockingBird

Transform your boring text into savage sarcasm with AI-powered wit

## About

**MockingBird** is a sarcasm translator app that uses Google's Gemini AI to convert regular text into witty, sarcastic responses. Choose your level of savagery and let the mockingbird do its thing!

## Features

- 🎭 **Three Sarcasm Modes**

  - `Light` – Playful banter for everyday fun
  - `Savage` – Sharp & cutting remarks
  - `Toxic` – Brutal roasting (use with caution!)

- 📱 **Cross-Platform Mobile App** – Works on iOS, Android
- 💾 **Translation History** – All your translations saved locally
- 📋 **Copy & Share** – Easily copy or share your sarcastic masterpieces
- 🌙 **Dark Theme** – Easy on the eyes, heavy on the sass
- ⚡ **Fast & Lightweight** – Powered by Gemini AI for quick responses

## Tech Stack

### Frontend

| Technology   | Purpose                         |
| ------------ | ------------------------------- |
| React Native | Cross-platform mobile framework |
| Expo         | Development & build tooling     |
| Expo Router  | File-based navigation           |
| Zustand      | State management                |
| AsyncStorage | Local data persistence          |
| TypeScript   | Type safety                     |

### Backend

| Technology       | Purpose             |
| ---------------- | ------------------- |
| Node.js          | Runtime environment |
| Express          | Web framework       |
| Google Gemini AI | Sarcasm generation  |
| Helmet           | Security middleware |
| Rate Limiter     | API protection      |
| Vercel           | Deployment platform |

## Rate Limiting

- **30 requests per minute** per IP address
- Exceeding the limit returns: `"Too much sarcasm for now, try again in a minute!"`

---

<p align="center">
  Made with 🖤 and excessive sarcasm
</p>
