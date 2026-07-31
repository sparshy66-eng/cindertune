// netlify/functions/gemini-spotify-import.js
//
// SERVER-SIDE ONLY. This is a Netlify serverless function.
//
// Why this file has to exist at all:
// Your GEMINI_API_KEY must never be sent to, or embedded in, the browser.
// Any key placed in client-side JS can be read by anyone via "View Source"
// or the Network tab, no matter how it's obfuscated. This function is the
// ONLY place the key is used — the browser calls THIS endpoint, and this
// endpoint calls Gemini.
//
// Setup:
//   1. Deploy this file at netlify/functions/gemini-spotify-import.js.
//   2. In the Netlify dashboard, set an environment variable:
//        GEMINI_API_KEY = <your key>
//      Never commit the real key to your repo or paste it in client code.
//   3. The frontend calls POST /.netlify/functions/gemini-spotify-import
//      with a JSON body of { url }.

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Basic shape check for a public Spotify playlist URL.
// Matches: https://open.spotify.com/playlist/<id>[?...]
const SPOTIFY_PLAYLIST_RE = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?playlist\/([a-zA-Z0-9]+)(?:\?.*)?$/i;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function buildPrompt(url) {
  return `You are a music playlist extractor. Analyze this PUBLIC Spotify playlist URL: ${url}. Extract every song from the playlist. Return ONLY valid JSON in the following format:
{
"songs": [
{
"title": "Song Name",
"artist": "Artist Name"
}
]
}
Do not include markdown, explanations, or any extra text. Return only JSON.`;
}

// Pulls the first JSON object out of a model response, tolerating the
// occasional stray ```json fence even though we asked it not to include one.
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in model response');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

exports.handler = async (event, context) => {
  // CORS: relax/adjust the origin below to your real domain in production.
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Use POST.' }),
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fails safe: if the env var isn't set, we never fall back to a
    // hardcoded key. Fix this in your host's environment variable settings.
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Server is missing GEMINI_API_KEY. Set it in your hosting provider\'s environment variables.' }),
    };
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid JSON body.' }),
    };
  }

  const { url } = body || {};
  if (!url || typeof url !== 'string') {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Missing "url" in request body.' }),
    };
  }
  if (!SPOTIFY_PLAYLIST_RE.test(url.trim())) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'That doesn\'t look like a public Spotify playlist link (expected something like https://open.spotify.com/playlist/...).' }),
    };
  }

  try {
    const geminiRes = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey, // key stays server-side, never touches the client
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(url.trim()) }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      console.error('Gemini API error:', geminiRes.status, errText);
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'The playlist import service is temporarily unavailable. Please try again shortly.' }),
      };
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';

    let parsed;
    try {
      parsed = extractJson(text);
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', text);
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Could not read the playlist data. Try again, or double-check the playlist is public.' }),
      };
    }

    const songs = Array.isArray(parsed.songs) ? parsed.songs : [];
    const clean = songs
      .filter(s => s && typeof s.title === 'string' && typeof s.artist === 'string')
      .map(s => ({ title: s.title.trim(), artist: s.artist.trim() }))
      .filter(s => s.title && s.artist);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ songs: clean }),
    };
  } catch (err) {
    console.error('Unexpected error calling Gemini:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Something went wrong reaching the import service. Please try again.' }),
    };
  }
};
