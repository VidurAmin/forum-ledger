# Forum 2026 Expense Ledger — Setup & Deploy

A private, hosted version of the ledger. One stable URL, email magic-link
login (only your email gets in), live data from any device. Free on both
Supabase and Vercel.

Total time: about 20 minutes, no coding required.

---

## What you are setting up

- **Supabase** — free hosted database + email login (the "backend").
- **Vercel** — free hosting for the website (the "frontend").
- They talk to each other via two keys you paste into Vercel.

---

## Step 1 — Create the Supabase project (5 min)

1. Go to supabase.com, sign up (free), click **New project**.
2. Name it `forum-ledger`, set a database password (save it somewhere),
   pick the region closest to Bangalore (Singapore / Mumbai), create.
3. Wait ~2 min for it to provision.

## Step 2 — Create the tables + load your data (2 min)

1. In Supabase, left sidebar → **SQL Editor** → **New query**.
2. Open `supabase_setup.sql` from this folder, copy all of it, paste in.
3. Click **Run**. You should see "Success". This creates the tables,
   locks them to signed-in users only, and seeds your current ledger
   (5 meetings + 5 settlements).

## Step 3 — Lock login to just your email (2 min)

1. Sidebar → **Authentication** → **Sign In / Providers** → make sure
   **Email** is enabled (it is by default). Magic link is on by default.
2. To ensure ONLY you can sign in, sidebar → **Authentication** →
   **Settings**:
   - Turn **OFF** "Allow new users to sign up".
   - Then add yourself: **Authentication** → **Users** → **Add user** →
     enter your email (any email you control). This pre-authorizes only you.
   - Now anyone else who tries the magic link is rejected because signups
     are closed and they are not in the user list.

## Step 4 — Grab your two keys (1 min)

1. Sidebar → **Project Settings** → **API**.
2. Copy the **Project URL** (looks like `https://abcd.supabase.co`).
3. Copy the **anon / public** key (a long string). This key is safe to
   ship in a frontend — your data is still protected by the login rules
   from Step 3.

## Step 5 — Put the code on GitHub (3 min)

Easiest path: github.com → **New repository** → name it `forum-ledger` →
Create. Then on the repo page use **uploading an existing file** and drag
in everything from this folder EXCEPT `node_modules` and `dist` (those
rebuild automatically). Commit.

(If you use git on your machine: `git init && git add . && git commit -m
"forum ledger" && git remote add origin <repo-url> && git push -u origin
main`.)

## Step 6 — Deploy on Vercel (3 min)

1. Go to vercel.com, sign in with GitHub, **Add New → Project**.
2. Import the `forum-ledger` repo. Vercel auto-detects Vite — leave the
   build settings as-is.
3. Before deploying, expand **Environment Variables** and add the two
   from Step 4:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Click **Deploy**. In ~1 min you get a URL like
   `https://forum-ledger.vercel.app`.

## Step 7 — Point Supabase back at your live URL (1 min)

1. Copy your new Vercel URL.
2. Supabase → **Authentication** → **URL Configuration**:
   - Set **Site URL** to your Vercel URL.
   - Add it under **Redirect URLs** too.
   This makes the magic link land back on your live site.

---

## Done — using it

1. Open your Vercel URL. Enter your email → tap **Send sign-in link**.
2. Check inbox, tap the link, you are in. The session stays logged in on
   that device, so day to day you just open the URL.
3. Bookmark the Vercel URL on your phone and laptop. Same data everywhere,
   always current. Edit cells, record settlements — it saves to Supabase
   instantly.

## Notes

- **Custom domain** (optional): in Vercel → Project → Domains, you can
  point something like `ledger.slkgroup.com` at it. Re-add that domain to
  Supabase Site URL / Redirect URLs if you do.
- **Access stays with you**: only emails you add under Supabase →
  Authentication → Users can sign in. Sharing the URL alone gets no one in.
- **Backup**: Supabase → Table Editor → export any table to CSV anytime.
- **Cost**: both free tiers cover this use comfortably; no card needed.
