const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // ✅ install with: npm install node-fetch

const app = express();

app.use(express.json());
app.use(cors());

// ✅ FIX: Express 5 requires regex for wildcard routes
app.options(/.*/, cors());

// Your original predictions endpoint (kept intact)
app.get('/api/predictions', (req, res) => {
  res.json({
    predictions: [
      { id: 1, title: "Team A will win", confidence: 0.75 },
      { id: 2, title: "Player X will score", confidence: 0.65 }
    ]
  });
});

// ✅ NEW: Extended predictions endpoint for multiple sports using Sportradar (football live + stubs for others)
app.get('/api/predictions-by-sport', async (req, res) => {
  const sport = (req.query.sport || "football").toLowerCase();
  const date = req.query.date || "2025-12-05"; // optional date override for schedules
  let matches = [];

  // Existing stubbed matches for non-football (kept intact to avoid breaking Builder.io)
  const sampleMatches = {
    football: [
      {
        id: 1,
        teamA: "Manchester United",
        teamB: "Liverpool",
        matchTime: "2025-12-05T19:30:00Z",
        winProbability: 0.62,
        textCommentary:
          "We suggest Manchester United could perform strongly based on recent form. Outcomes are not guaranteed."
      }
    ],
    rugby: [
      {
        id: 2,
        teamA: "Springboks",
        teamB: "All Blacks",
        matchTime: "2025-12-06T15:00:00Z",
        winProbability: 0.55,
        textCommentary:
          "We suggest the Springboks could edge this one based on recent form. Outcomes are not guaranteed."
      }
    ],
    tennis: [
      {
        id: 3,
        teamA: "Novak Djokovic",
        teamB: "Carlos Alcaraz",
        matchTime: "2025-12-07T12:00:00Z",
        winProbability: 0.70,
        textCommentary:
          "We suggest Djokovic could perform strongly based on recent form. Outcomes are not guaranteed."
      }
    ],
    basketball: [
      {
        id: 4,
        teamA: "Lakers",
        teamB: "Warriors",
        matchTime: "2025-12-08T20:00:00Z",
        winProbability: 0.48,
        textCommentary:
          "We suggest the Warriors could perform strongly based on recent form. Outcomes are not guaranteed."
      }
    ],
    icehockey: [
      {
        id: 5,
        teamA: "Toronto Maple Leafs",
        teamB: "Montreal Canadiens",
        matchTime: "2025-12-09T19:00:00Z",
        winProbability: 0.60,
        textCommentary:
          "We suggest Toronto Maple Leafs could perform strongly based on recent form. Outcomes are not guaranteed."
      }
    ],
    snooker: [
      {
        id: 6,
        teamA: "Ronnie O'Sullivan",
        teamB: "Judd Trump",
        matchTime: "2025-12-10T14:00:00Z",
        winProbability: 0.65,
        textCommentary:
          "We suggest Ronnie O'Sullivan could perform strongly based on recent form. Outcomes are not guaranteed."
      }
    ]
  };

  try {
    if (sport === "football") {
      // ✅ Live data from Sportradar (soccer). Uses optional ?date=YYYY-MM-DD; defaults above.
      const url = `https://api.sportradar.com/soccer/trial/v4/en/schedules/${date}/results.json?api_key=${process.env.SPORTRADAR_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.error("Sportradar fetch failed:", response.status, await response.text());
      }
      const data = await response.json();

      if (data && Array.isArray(data.results)) {
        matches = data.results
          .filter(m => m && m.sport_event && Array.isArray(m.sport_event.competitors) && m.sport_event.competitors.length >= 2)
          .map(match => {
            const home = match.sport_event.competitors[0];
            const away = match.sport_event.competitors[1];
            return {
              id: match.sport_event.id,
              teamA: home.name,
              teamB: away.name,
              matchTime: match.sport_event.start_time,
              winProbability: 0.5, // placeholder until odds integrated
              textCommentary: `We suggest ${home.name} vs ${away.name} could be competitive. Outcomes are not guaranteed.`
            };
          });
      }

      // If Sportradar returns nothing, fall back to stub to avoid breaking Builder.io
      if (!matches || matches.length === 0) {
        matches = sampleMatches.football;
      }
    } else {
      // ✅ For now, keep stubs for other sports so nothing breaks
      matches = sampleMatches[sport] || [];
    }

    res.json({ matches });
  } catch (err) {
    console.error("Error in /api/predictions-by-sport:", err);
    // On error, respond with safe fallback so Builder.io doesn't break
    res.status(200).json({ matches: sampleMatches[sport] || [] });
  }
});

// ✅ FIX: Catch-all route must also use regex
app.get(/.*/, (req, res) => {
  res.json({ message: "Backend is running" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
