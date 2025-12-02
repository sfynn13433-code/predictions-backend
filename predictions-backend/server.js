const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // install with: npm install node-fetch

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

// ✅ NEW: Extended predictions endpoint for multiple sports using Sportradar
app.get('/api/predictions-by-sport', async (req, res) => {
  const sport = (req.query.sport || "football").toLowerCase();

  // ✅ Default date = today in YYYY-MM-DD format, unless overridden with ?date=YYYY-MM-DD
  const today = new Date();
  const date = req.query.date || today.toISOString().split('T')[0];

  let matches = [];

  // Stubbed fallback data for each sport (kept to avoid breaking Builder.io)
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
    // Map sport to Sportradar schedule endpoints
    const endpoints = {
      football: `https://api.sportradar.com/soccer/trial/v4/en/schedules/${date}/results.json`,
      rugby: `https://api.sportradar.com/rugby/trial/v2/en/schedules/${date}/results.json`,
      tennis: `https://api.sportradar.com/tennis/trial/v3/en/schedules/${date}/results.json`,
      basketball: `https://api.sportradar.com/basketball/trial/v7/en/schedules/${date}/results.json`,
      icehockey: `https://api.sportradar.com/icehockey/trial/v2/en/schedules/${date}/results.json`,
      snooker: `https://api.sportradar.com/snooker/trial/v2/en/schedules/${date}/results.json`
    };

    if (endpoints[sport]) {
      const url = `${endpoints[sport]}?api_key=${process.env.SPORTRADAR_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && Array.isArray(data.results)) {
        matches = data.results
          .filter(m => m?.sport_event?.competitors?.length >= 2)
          .map(m => ({
            id: m.sport_event.id,
            teamA: m.sport_event.competitors[0].name,
            teamB: m.sport_event.competitors[1].name,
            matchTime: m.sport_event.start_time,
            winProbability: 0.5, // placeholder until odds integrated
            textCommentary: `We suggest ${m.sport_event.competitors[0].name} vs ${m.sport_event.competitors[1].name} could be competitive. Outcomes are not guaranteed.`
          }));
      }

      // Fallback to stubs if no live data returned
      if (!matches.length) {
        matches = sampleMatches[sport] || [];
      }
    } else {
      // Unknown sport: return stub if available
      matches = sampleMatches[sport] || [];
    }

    res.json({ matches });
  } catch (err) {
    console.error("Error in /api/predictions-by-sport:", err);
    // Safe fallback so Builder.io doesn't break
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
