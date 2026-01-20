# Burner Rooms

A minimal, privacy-first chat application that lets anyone create short-lived, anonymous chat rooms. Rooms are assigned friendly anonymous names by the client and automatically expire after a configurable TTL.

This repository contains a Next.js frontend with a lightweight Elysia-based backend API and uses Upstash (Redis + Realtime) for ephemeral storage and realtime events. The app is optimized for fast, serverless deployment (Vercel recommended).

- Live demo: [Burner-rooms](https://burner-rooms.shivraj-kolekar.in/)
- Author: Shivaraj-Kolekar

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [How it works (high level)](#how-it-works-high-level)
- [Local setup](#local-setup)
  - [Prerequisites](#prerequisites)
  - [Environment variables](#environment-variables)
  - [Install and run](#install-and-run)
- [Deployment (Vercel)](#deployment-vercel)
- [Developer notes & caveats](#developer-notes--caveats)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Create ephemeral chat rooms with a custom time limit and participants limit
- Client-side anonymous identity generation (e.g. `anonyms-dog-abc12`)
- Realtime messaging powered by Upstash Realtime with emoji and threads suport
- Room metadata and messages stored in Upstash Redis with TTL
- Rooms self-destruct when TTL expires (users redirected if room expired)
- Small serverless-first footprint suitable for Vercel + Upstash

---

## Tech stack

- Framework: Next.js (App Router)
- Server API: Elysia (embedded API routes)
- Realtime: Upstash Realtime
- Database / storage: Upstash Redis
- Client state & caching: @tanstack/react-query
- Utilities: nanoid (anonymous id generation)
- Styling: Tailwind CSS and shadcn
- Language: TypeScript

Key paths:
- Next.js app: `src/app/*`
- API routes & Elysia entry: `src/app/api/[[...slugs]]/route.ts`
- Upstash Realtime route: `src/app/api/realtime/route.ts`
- Redis client: `src/lib/redis.ts`
- Client & realtime helpers: `src/lib/client.ts`, `src/lib/realtime-client.ts`
- Anonymous username hook: `src/hooks/useUsername.ts`

---

## How it works (high level)

1. When a user creates a room, the server stores room metadata in Redis and sets a TTL.
2. The client generates and stores an anonymous identity in `localStorage`.
3. Realtime events (messages, join/leave, destroy) are delivered via Upstash Realtime.
4. When the room TTL expires (or the room is destroyed), the Redis metadata disappears and the app redirects users (room not found).
5. A small middleware/proxy (see `src/proxy.ts`) validates room IDs and can redirect when rooms are missing/expired.

---

## Local setup

### Prerequisites

- Node.js 18+ (recommended)
- npm / pnpm / yarn
- Upstash account (for Redis + Realtime)
- Optional: Vercel account for deployment

### Environment variables

Create a `.env.local` file at the project root. At minimum you will need the Upstash connection values and the API URL:

- NEXT_PUBLIC_API_URL=http://localhost:3000/api
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN


Note: The project uses `Redis.fromEnv()` and Upstash helpers that read connection values from environment variables. Confirm the exact variable names in `src/lib/redis.ts` or Upstash docs if needed.

Example `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
UPSTASH_REDIS_REST_URL=https://us1-XXXX.upstash.io
UPSTASH_REDIS_REST_TOKEN=put-your-upstash-rest-token-here
# If your Upstash Realtime instance uses separate values:
UPSTASH_REALTIME_REST_URL=https://realtime-XXXX.upstash.io
UPSTASH_REALTIME_REST_TOKEN=put-your-upstash-realtime-token-here
```

### Install and run

1. Clone the repo
```
git clone https://github.com/Shivaraj-Kolekar/Burner-Rooms.git
cd Burner-Rooms
```

2. Install dependencies
```
npm install
# or
pnpm install
# or
yarn
```

3. Add `.env.local` (see above).

4. Run the dev server
```
npm run dev
# or
pnpm dev
# or
yarn dev
```

5. Open http://localhost:3000

Build :
```
npm run build

```

---

## Deployment (Vercel)

This project is designed to be deployed on Vercel:

1. Push your repository to GitHub.
2. Import the repository into Vercel.
3. In the Vercel project settings, add the required Environment Variables (same keys as in `.env.local`) — particularly Upstash REST & Realtime credentials and `NEXT_PUBLIC_API_URL`.
4. Deploy. Vercel will build the Next.js app and host both the frontend and API routes.

Notes:
- Ensure `NEXT_PUBLIC_API_URL` points to your deployed site API in production (e.g. `https://your-app.vercel.app/api`).
- Upstash Realtime works well with serverless providers; double-check credentials and allowed origins.

---

## Troubleshooting

- "Room not found" when entering a room:
  - The room TTL may have expired or the room wasn't created correctly. Check Redis data in the Upstash console.
  - Verify `UPSTASH_*` environment variables are correct.

- Realtime connection issues:
  - Confirm Realtime credentials/URL are correct and accessible.
  - Inspect browser console/network traffic and Vercel server logs.

- API calls failing:
  - Make sure `NEXT_PUBLIC_API_URL` is set correctly for the client and server environments.

