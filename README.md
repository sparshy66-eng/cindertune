# Wallflow Radio — what changed & how to run it

## Latest fix (this version)
Two bugs, one root cause: **Firebase was never actually connected**, even though real
project keys were already sitting in `firebase-config.js` — the file was missing the
one line that turns those keys on (`firebase.initializeApp(...)`). Because of that,
accounts only ever lived in the browser's local storage (so signing in from another
device/browser said "no account"), and friend requests only worked between tabs on
one device (so they felt fake). Fixed:
- Real accounts now use **Firebase Authentication** — sign up once, sign in from any
  device or browser with the same email/password.
- Friend identity now follows your **account**, not a random per-browser ID, so
  requests, accept/decline, and presence all sync for real, live, across devices.
- "Forgot password" now sends a real reset email.
- Keep all four files together and re-upload them as a set (don't mix with older copies).

## Files (keep all four in the same folder)
- `wallflow-radio_11_3_4.html` — the app itself, open this
- `firebase-config.js` — connects Rooms + Friends to a real server for cross-device sync
- `social.js` — powers the Friends tab (Name#Tag identity, friend requests, presence, chat)
- `README.md` — this file

---

## 1. Fixes from your last message

**Cover art was hidden behind big black circles.** Fixed — the "vinyl label" circle that used to sit in the middle of every photo is gone. Station cards, library rows, the mini-player, and the tracklist now show the real photo clean and full, like a normal album cover.

**Tracklist rows looked cramped.** Bigger art (40px, rounded), more breathing room, and a clearer highlight on whichever track is playing.

**No sound.** Two things going on:
1. I hardened the YouTube playback: explicit unmute/volume, and if one specific video is blocked in a region or has embedding disabled, it now auto-skips to the next track instead of just sitting silent.
2. **The most likely real cause:** if you've been testing by double-clicking the HTML file (a `file://` URL), YouTube's player often refuses to work at all — it needs the page served over `http(s)://`. This is exactly what hosting it on GitHub Pages fixes automatically (see below). Test it there before assuming something's still broken.

**Removed the radio "click"/static-burst sound** that played every time the tuning dial landed on a station.

## 2. Friend requests — now real, Valorant-style

You were right, this wasn't built yet — here's what's actually in place now:
- Every account gets a permanent ID like **`Alex#4821`** (name + a 4-digit tag), shown in the account dropdown and at the top of the Friends tab with a Copy button.
- **Add a Friend** box on the Friends tab: type someone's `Name#1234`, hit Send Request.
- They see it under **Friend Requests** with Accept/Decline.
- Once accepted, you both show up in **My Friends**, with live "listening to X" status and a Remove option.
- The "Everyone on Wallflow" directory still exists for browsing, but its button now sends a real request too, not an instant add.

One honest limit: tags are generated from a hash of your email, not checked for uniqueness against everyone else — fine for a class project, but two people could theoretically land on the same tag. A real product would check uniqueness server-side at signup.

## 3. Rooms — make a room, invite friends, listen together
Still works as before: Create a Room → get a code → friends join with it → everyone hears the same song live, with a member list and room chat. Works instantly across browser tabs for testing; needs `firebase-config.js` filled in for real cross-device use (5-minute free setup, instructions inside that file).

---

## 4. Uploading to GitHub (so it's a live link, and so audio actually works)

**Why this matters for you specifically:** GitHub Pages serves your file over `https://`, which is what YouTube's player needs. This alone may fix the "no sound" issue.

### Step-by-step
1. **Create a GitHub account** at github.com if you don't have one.
2. **Create a new repository:**
   - Click the **+** in the top-right → **New repository**
   - Name it anything, e.g. `wallflow-radio`
   - Set it to **Public**
   - Don't add a README (you already have one) — click **Create repository**
3. **Upload your files:**
   - On the new repo's page, click **"uploading an existing file"** (or the **Add file → Upload files** button)
   - Drag in all four files: `wallflow-radio_11_3_4.html`, `firebase-config.js`, `social.js`, `README.md`
   - Scroll down, click **Commit changes**
4. **Rename the HTML file to `index.html`** (this makes it the default page GitHub Pages loads):
   - Click on `wallflow-radio_11_3_4.html` in the file list → click the pencil (Edit) icon
   - Click the filename at the top and change it to `index.html`
   - Click **Commit changes**
5. **Turn on GitHub Pages:**
   - Go to the repo's **Settings** tab → **Pages** (left sidebar)
   - Under "Build and deployment" → Source, choose **Deploy from a branch**
   - Branch: `main`, folder: `/ (root)` → **Save**
6. **Wait about 1 minute**, then refresh that Pages settings page — it'll show you a live URL like:
   `https://yourusername.github.io/wallflow-radio/`
7. Open that link — that's your submittable, live, working app.

### If you want rooms/friends to work across different phones (not just your own tabs)
Fill in `firebase-config.js` before uploading (or edit it later directly on GitHub — click the file → pencil icon → paste your keys → Commit). Setup instructions are written inside that file itself, takes about 5 minutes, free, no credit card.
