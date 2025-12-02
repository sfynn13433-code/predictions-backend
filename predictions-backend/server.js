const express = require('express');
const cors = require('cors');

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

// ✅ NEW: Extended predictions endpoint for multiple sports
app.get('/api/predictions-by-sport', (req, res) => {
  const sport = req.query.sport || "football"; // default to football if none provided

  // Example stubbed matches per sport (replace with real API/AI later)
  const sampleMatches = {
    football: [
      {
        id: 1,
        teamA: "Manchester United",
        teamB: "Liverpool",
        matchTime: "2025-12-05T19:30:00Z",
        winProbability: 0.62,
        textCommentary: "We suggest Manchester United could perform strongly based on recent form. Outcomes are not guaranteed."
      }
    ],
    rugby: [
      {
        id: 2,
        teamA: "Springboks",
        teamB: "All Blacks",
        matchTime: "2025-12-06T15:00:00Z",
        winProbability: 0.55,
        textCommentary: "We suggest the Springboks could edge this one based on recent form. Outcomes are not guaranteed."
      }
    ],
    tennis: [
      {
        id: 3,
        teamA: "Novak Djokovic",
        teamB: "Carlos Alcaraz",
        matchTime: "2025-12-07T12:00:00Z",
        winProbability: 0.70,
        textCommentary: "We suggest Djokovic could perform strongly based on recent form. Outcomes are not guaranteed."
      }
    ],
    basketball: [
      {
        id: 4,
        teamA: "Lakers",
        teamB: "Warriors",
        matchTime: "2025-12-08T20:00:00Z",
        winProbability: 0.48,
        textCommentary: "We suggest the Warriors could perform strongly based on recent form. Outcomes are not guaranteed."
      }
    ],
    icehockey: [
      {
        id: 5,
        teamA: "Toronto Maple Leafs",
        teamB: "Montreal Canadiens",
        matchTime: "2025-12-09T19:00:00Z",
        winProbability: 0.60,
        textCommentary: "We suggest Toronto Maple Leafs could perform strongly based on recent form. Outcomes are not guaranteed."
      }
    ],
    snooker: [
      {
        id: 6,
        teamA: "Ronnie O'Sullivan",
        teamB: "Judd Trump",
        matchTime: "2025-12-10T14:00:00Z",
        winProbability: 0.65,
        textCommentary: "We suggest Ronnie O'Sullivan could perform strongly based on recent form. Outcomes are not guaranteed."
      }
    ]
  };

  const matches = sampleMatches[sport.toLowerCase()] || [];
  res.json({ matches });
});

// ✅ FIX: Catch-all route must also use regex
app.get(/.*/, (req, res) => {
  res.json({ message: "Backend is running" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
