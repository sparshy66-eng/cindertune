// ============================================================================
// Wallflow Radio — Firebase config
// ============================================================================
// This file connects the app to a free Firebase Realtime Database, which is
// what lets Rooms (and the Friends/social tab) sync across DIFFERENT devices
// and phones instead of just across browser tabs on one computer.
//
// Without this filled in, Rooms still work — but only across tabs open on the
// SAME device (handy for testing/demoing, not for real friends on their own
// phones). Fill this in for the real thing. It takes about 5 minutes and the
// free tier is generous enough for a class project or small app.
//
// SETUP STEPS:
// 1. Go to https://console.firebase.google.com and click "Add project".
//    Name it anything (e.g. "wallflow-radio"). You can skip Google Analytics.
// 2. In your new project, click the "</>" (Web) icon to register a web app.
//    Name it anything, then click "Register app". Firebase will show you a
//    config object that looks like the one below — copy YOUR values into it.
// 3. In the left sidebar, go to Build -> Realtime Database -> Create Database.
//    Choose any region, and start in TEST MODE (fine for a class project —
//    see the security note at the bottom of this file for production use).
// 4. Paste your config values below, save this file, and upload/host it in
//    the SAME folder as the main HTML file (they must sit next to each other).
// 5. Open the app — the "no multiplayer server configured" banner on the
//    Rooms tab will disappear once this is filled in correctly.
// ============================================================================

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Only initialize if it looks like real keys have been pasted in above —
// this keeps the app from crashing if you haven't set this up yet.
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
  firebase.initializeApp(firebaseConfig);
}

// ----------------------------------------------------------------------------
// SECURITY NOTE (read before sharing a public link to a real audience):
// "Test mode" Realtime Database rules allow anyone to read/write all data.
// That's fine for a class submission/demo. If you ever make this public long
// term, go to Realtime Database -> Rules and tighten them, e.g.:
//
// {
//   "rules": {
//     "wf_rooms": { ".read": true, ".write": true },
//     "wf_room_chat": { ".read": true, ".write": true }
//   }
// }
// (This still allows open read/write to just these two paths, which is
// simple and workable for a small friends-and-family app. Proper per-user
// auth rules are a further step beyond this project's scope.)
// ----------------------------------------------------------------------------
