// server.js

// ==============================
// Imports & App Setup
// ==============================
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // For Node <=20; Node 18+ has global fetch, but keeping explicit for reliability.

const app = express();

// CORS for frontend (Builder.io or your domain). Global allow for now.
app.use(cors());

// Body parsing for future POST endpoints, if needed.
app.use(express.json());

// ==============================
// Config & Constants
// ==============================
const PORT = process.env.PORT || 4000;
const API_SPORTS_KEY = process.env.API_SPORTS_KEY; // API-Sports key

// Base URLs for API-Sports endpoints
const API_SPORTS_BASE = {
  football: "https://v3.football.api-sports.io",
  rugby: "https://v1.rugby.api-sports.io",
  basketball: "https://v1.basketball.api-sports.io",
  icehockey: "https://v1.hockey.api-sports.io",
  tennis: "https://v1.tennis.api-sports.io",
  snooker: "https://v1.snooker.api-sports.io",
};

// Supported sports (aligned with your platform scope)
const SUPPORTED_SPORTS = new Set([
  "football",
  "rugby",
  "tennis",
  "basketball",
  "icehockey",
  "snooker",
]);

// ==============================
// Utilities
// ==============================

/**
 * Build API-Sports URL for predictions by sport.
 */
function buildApiSportsUrlForPredictions(sport) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  switch (sport) {
    case "football":
      // Football supports live fixtures
      return `${API_SPORTS_BASE.football}/fixtures?live=all`;

    case "basketball":
      return `${API_SPORTS_BASE.basketball}/games?date=${today}`;

    case "rugby":
      return `${API_SPORTS_BASE.rugby}/games?date=${today}`;

    case "icehockey":
      return `${API_SPORTS_BASE.icehockey}/games?date=${today}`;

    case "tennis":
      // Tennis requires season/tournament IDs, not just date.
      // For now, return null so we can handle gracefully in the route.
      return null;

    case "snooker":
      return `${API_SPORTS_BASE.snooker}/games?date=${today}`;

    default:
      return null;
  }
}

/**
 * Normalize upstream payload into a stable schema for the frontend.
 */
function normalizePredictionsResponse(sport, upstream) {
  return {
    sport,
    fetchedAt: new Date().toISOString(),
    data: upstream,
  };
}

/**
 * Generate AI-style expert conclusion from upstream data.
 */
function generateExpertConclusion(sport, upstream) {
  const teams =
    upstream?.teams ||
    upstream?.match?.teams ||
    upstream?.fixture?.teams ||
    null;

  const teamA =
    (Array.isArray(teams) && teams[0]?.name) ||
    upstream?.homeTeam?.name ||
    upstream?.home?.name ||
    "Home";
  const teamB =
    (Array.isArray(teams) && teams[1]?.name) ||
    upstream?.awayTeam?.name ||
    upstream?.away?.name ||
    "Away";

  const edge =
    upstream?.modelEdge ||
    upstream?.probabilities?.favorite ||
    upstream?.summary ||
    null;

  const baseLine = edge
    ? `Edge to ${typeof edge === "string" ? edge : JSON.stringify(edge)}`
    : "The match appears closely contested";

  return `Expert analysis for ${sport}: ${teamA} vs ${teamB}. ${baseLine}. Consider recent form, injuries, and venue effects; late team news may shift momentum. Predictions are guidance, not guarantees.`;
}

// ==============================
// Routes
// ==============================

app.get("/", (req, res) => {
  res.send(
    "Backend is live 🎉 Try /health, /api/supported-sports, or /api/predictions-by-sport?sport=football"
  );
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});

app.get("/api/supported-sports", (req, res) => {
  res.json({ sports: Array.from(SUPPORTED_SPORTS) });
});

app.get("/api/subscriptions", (req, res) => {
  res.json({
    plans: [
      {
        name: "Free",
        duration: "7 days",
        price: "0",
        features: [
          "Basic predictions",
          "Limited refresh frequency",
          "No priority updates",
        ],
      },
      {
        name: "Pro",
        duration: "30 days",
        price: "9.99",
        features: [
          "All sports",
          "AI expert conclusions",
          "Priority updates",
          "Faster refresh",
        ],
      },
      {
        name: "Premium",
        duration: "90 days",
        price: "24.99",
        features: [
          "All sports",
          "AI expert conclusions",
          "Priority updates",
          "Early features access",
        ],
      },
    ],
    updatedAt: new Date().toISOString(),
  });
});

/**
 * Primary endpoint: predictions + AI conclusion, per sport.
 * GET /api/predictions-by-sport?sport=football
 */
app.get("/api/predictions-by-sport", async (req, res) => {
  try {
    const sport = (req.query.sport || "").toLowerCase().trim();

    if (!sport) {
      return res.status(400).json({
        error: "Missing required query parameter: sport",
        hint:
          "Use ?sport=football|rugby|tennis|basketball|icehockey|snooker",
      });
    }

    if (!SUPPORTED_SPORTS.has(sport)) {
      return res.status(400).json({
        error: `Unsupported sport: '${sport}'`,
        supported: Array.from(SUPPORTED_SPORTS),
      });
    }

    if (!API_SPORTS_KEY) {
      return res.status(500).json({
        error: "API_SPORTS_KEY is not configured on the server",
      });
    }

    const url = buildApiSportsUrlForPredictions(sport);

    // Special handling for tennis
    if (sport === "tennis" && !url) {
      return res.json({
        sport,
        fetchedAt: new Date().toISOString(),
        data: {},
        expertConclusion:
          "No tennis games available until a season or tournament is specified.",
      });
    }

    if (!url) {
      return res.status(400).json({ error: "Sport mapping not found" });
    }

    let headers = {
      accept: "application/json",
      "x-apisports-key": API_SPORTS_KEY,
    };

    const upstreamResponse = await fetch(url, { method: "GET", headers });

    if (!upstreamResponse.ok) {
      const upstreamBody = await upstreamResponse
        .text()
        .catch(() => "Unable to read upstream response body");
      return res.status(502).json({
        error: "Upstream fetch to API-Sports failed",
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        upstreamBody,
      });
    }

    const upstreamPayload = await upstreamResponse.json();

    // Fallback if no fixtures found
    if (!upstreamPayload.response || upstreamPayload.response.length === 0) {
      return res.json({
        sport,
        fetchedAt: new Date().toISOString(),
        data: upstreamPayload,
        expertConclusion: `No ${sport} games scheduled today.`,
      });
    }

    const normalized = normalizePredictionsResponse(sport, upstreamPayload);
    normalized.expertConclusion = generateExpertConclusion(
      sport,
      upstreamPayload
    );

    res.set("Cache-Control", "public, max-age=30");

    return res.json(normalized);
  } catch (err) {
    console.error("Error in /api/predictions-by-sport:", err);
    return res
      .status(500)
      .json({ error: "Failed to fetch predictions from API-Sports" });
  }
});

// ==============================
// Server Start
// ==============================
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
