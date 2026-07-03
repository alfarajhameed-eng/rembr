# Rembr

A reminder system that learns you. Phase 1 scaffold.

## Setup — run these in Git Bash, in order

### 1. Create the GitHub repo
Go to github.com under your **personal** account → New repository → name it `rembr` → do NOT initialize with README (we already have one).

### 2. Push this scaffold
```bash
cd path/to/this/folder
git init
git add .
git commit -m "Phase 1: project scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rembr.git
git push -u origin main
```

### 3. Install dependencies
```bash
npm install
```

### 4. Create the Supabase project
Go to supabase.com → New project → name it `rembr` → copy the Project URL and anon key.

### 5. Set up local env
```bash
cp .env.example .env.local
```
Paste your Supabase URL and anon key into `.env.local`.

### 6. Run locally
```bash
npm run dev
```
Visit http://localhost:3000

### 7. Deploy to Vercel
```bash
npx vercel
```
Follow prompts to link to a new Vercel project. Then add the same env vars from `.env.local` into the Vercel project settings (Settings → Environment Variables).

### 8. Test on your wife's iPhone
Once deployed, open the Vercel URL in Safari on her iPhone → Share → Add to Home Screen. This is required before push notifications will work (iOS requirement, not something we can skip).

---

## What's in this scaffold
- `app/` — Next.js App Router pages
- `public/manifest.json` — PWA manifest (required for iOS installability)
- `public/sw.js` — service worker stub (handles push events — payload logic comes in Phase 4)
- `lib/supabaseClient.ts` — Supabase connection helper

## Not yet built (next phases)
- Icons (need `icon-192.png` and `icon-512.png` in `/public` — placeholder needed before first deploy)
- Database schema (reminders, checkins, user_patterns tables)
- VAPID key generation + push subscription flow
- Anthropic API route for the conversational "brain"
- Reminder creation UI
