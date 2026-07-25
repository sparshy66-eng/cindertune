const firebaseConfig = {
  apiKey: "AIzaSyBYPok8vVFZCDpmgZywxJrKtAhy13wMGLI",
  authDomain: "cindertune-cad8b.firebaseapp.com",
  databaseURL: "https://cindertune-cad8b-default-rtdb.firebaseio.com",
  projectId: "cindertune-cad8b",
  storageBucket: "cindertune-cad8b.firebasestorage.app",
  messagingSenderId: "865518101222",
  appId: "1:865518101222:web:44d9cee2be58f603d51127"
};

// This line was missing before. Without it, the app never actually connects to
// Firebase, so every feature silently falls back to local-only/per-device mode
// even though the keys above are valid and real. Adding it is the fix for both
// "friend requests feel fake" and "accounts don't work on other devices/browsers".
firebase.initializeApp(firebaseConfig);
