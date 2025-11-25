# MockingBird Backend

Node.js Express API server for the Sarcasm Translator app.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with your Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=development
```

3. Start development server:

```bash
npm run dev
```

4. For production:

```bash
npm start
```

## API Endpoints

### POST /api/translate

Translates text to sarcastic version.

**Request Body:**

```json
{
  "text": "I overslept for work again.",
  "mode": "savage"
}
```

**Modes:**

- `light` - Playful banter
- `savage` - Sharp & cutting
- `toxic` - Brutal roasting

**Success Response:**

```json
{
  "original": "I overslept for work again.",
  "translated": "Wow, shocking. Usually, you're the beacon of punctuality. Said no one ever.",
  "mode": "savage"
}
```

**Error Response:**

```json
{
  "error": "The sarcasm generator is broken. Try again."
}
```

### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-11-25T12:00:00.000Z"
}
```

## Deployment

This server is configured for deployment on Vercel.

Create a `vercel.json` in the root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ]
}
```

Set your `GEMINI_API_KEY` in Vercel environment variables.

## Rate Limiting

- 30 requests per minute per IP
- Returns "Too much sarcasm for now, try again in a minute!" when exceeded
