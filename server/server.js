import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { YoutubeTranscript } from "youtube-transcript";
import Database from "better-sqlite3";

dotenv.config();

const app = express();
// app.use(cors());
app.use(cors({ origin: "*" }));
// const allowedOrigins = [
//   "https://nikkinikki247-last-days-search.vercel.app",
//   "http://localhost:5173"
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin) return callback(null, true); // allow server-to-server / curl
//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }
//     return callback(new Error("Not allowed by CORS"));
//   }
// }));

app.use(express.json());


const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = "UChIH5OE7zixuR_EXqxSpyQg";

// ------------------------------
// DATABASE SETUP
// ------------------------------

const db = new Database("database.db");

// Create tables if they don’t exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS videos (
    videoId TEXT PRIMARY KEY
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS transcripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    videoId TEXT,
    text TEXT,
    timestamp REAL
  )
`).run();

// ------------------------------
// UTILITY
// ------------------------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ------------------------------
// GET UPLOADS ID
// ------------------------------

async function getUploadsId() {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`
  );

  const data = await res.json();

  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

// ------------------------------
// GET ALL VIDEO IDS
// ------------------------------

async function getAllVideoIds(uploadsId) {
  let videoIds = [];
  let nextPageToken = "";

  do {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsId}&maxResults=50&pageToken=${nextPageToken}&key=${API_KEY}`
    );

    const data = await res.json();

    const ids = data.items.map(
      item => item.contentDetails.videoId
    );

    videoIds.push(...ids);

    nextPageToken = data.nextPageToken || null;

  } while (nextPageToken);

  return videoIds;
}

async function fetchTranscript(videoId) {
  try {
    await sleep(1500); // prevent blocking

    const transcript =
      await YoutubeTranscript.fetchTranscript(videoId);

    return transcript;

  } catch (err) {
    console.log("Failed transcript:", videoId, err.message);
    return null;
  }
}


app.post("/sync", async (req, res) => {
  try {
    const uploadsId = await getUploadsId();
    const allVideoIds = await getAllVideoIds(uploadsId);

    // 🔥 LIMIT FIRST (avoid rate limiting)
    const limitedVideoIds = allVideoIds.slice(0, 25);

    const existingIds = new Set(
      db.prepare("SELECT videoId FROM videos").all().map(v => v.videoId)
    );

    const newVideos = limitedVideoIds.filter(
      id => !existingIds.has(id)
    );

    console.log("New videos to process:", newVideos.length);

    for (const videoId of newVideos) {
      console.log("Fetching transcript for:", videoId);

      const transcript = await fetchTranscript(videoId);

      if (!transcript) {
        console.log("❌ No transcript for:", videoId);
        continue;
      }

      // Insert video
      db.prepare(`
        INSERT OR IGNORE INTO videos (videoId)
        VALUES (?)
      `).run(videoId);

      // Insert transcript lines
      const insert = db.prepare(`
        INSERT INTO transcripts (videoId, text, timestamp)
        VALUES (?, ?, ?)
      `);

      const insertMany = db.transaction((lines) => {
        for (const line of lines) {
          insert.run(
            videoId,
            line.text,
            line.offset
          );
        }
      });

      insertMany(transcript);

      console.log("✅ Saved:", videoId);

      // 🔥 CRITICAL: slow down requests
      await sleep(4000 + Math.random() * 3000);
    }

    res.json({
      message: "Sync complete",
      processed: newVideos.length
    });

  } catch (err) {
    console.error("SYNC ERROR:", err);
    res.status(500).json({ error: "Sync failed" });
  }
});
// ------------------------------
// SEARCH ENDPOINT (FAST)
// ------------------------------

// app.post("/search", (req, res) => {
//   const { word } = req.body;

//   const results = db.prepare(`
//     SELECT videoId, text, timestamp
//     FROM transcripts
//     WHERE text LIKE ?
//     LIMIT 100
//   `).all(`%${word}%`);

//   res.json(results);
// });

app.post("/search", (req, res) => {
  try {
    const word = req.body?.word;

    if (!word) {
      return res.json([]);
    }

    const results = db.prepare(`
      SELECT videoId, text, timestamp
      FROM transcripts
      WHERE text LIKE ?
      LIMIT 100
    `).all(`%${word}%`);

    res.json(results);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});