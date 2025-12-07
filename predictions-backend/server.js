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
const X_RAPIDAPI_KEY = process.env.X_RAPIDAPI_KEY; // RapidAPI key
// Example RapidAPI base URL for API-Football (soccer). Replace with correct host for other sports.
const RAPIDAPI_BASE_URL = "https://api-football-v1.p.rapidapi.com/v3";

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
 * Build RapidAPI URL for predictions by sport.
 * Adjust path/query to match actual RapidAPI endpoints.
 */
function buildRapidApiUrlForPredictions(sport) {
  switch (sport) {
    case "football":
      // football in UI maps to soccer in API-Football
      return `${RAPIDAPI_BASE_URL}/fixtures?live=all`;
    case "rugby":
      // Example placeholder — replace with actual RapidAPI rugby endpoint
      return `https://example-rugby-api.p.rapidapi.com/matches`;
    case "tennis":
      // Example placeholder — replace with actual RapidAPI tennis endpoint
      return `https://example-tennis-api.p.rapidapi.com/matches`;
    case "basketball":
      // Example placeholder — replace with actual RapidAPI basketball endpoint
      return `https://example-basketball-api.p.rapidapi.com/games`;
    case "icehockey":
      // Example placeholder — replace with actual RapidAPI icehockey endpoint
      return `https://example-icehockey-api.p.rapidapi.com/matches`;
    case "snooker":
      // Example placeholder — replace with actual RapidAPI snooker endpoint
      return `https://example-snooker-api.p.rapidapi.com/matches`;
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

  const baseLine =
    edge
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

    if (!X_RAPIDAPI_KEY) {
      return res.status(500).json({
        error: "X_RAPIDAPI_KEY is not configured on the server",
      });
    }

    const url = buildRapidApiUrlForPredictions(sport);
    if (!url) {
      return res.status(400).json({ error: "Sport mapping not found" });
    }

    let headers = {
      accept: "application/json",
      "X-RapidAPI-Key": X_RAPIDAPI_KEY,
      "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com", // required for football
    };

    const upstreamResponse = await fetch(url, { method: "GET", headers });

    if (!upstreamResponse.ok) {
      const upstreamBody = await upstreamResponse
        .text()
        .catch(() => "Unable to read upstream response body");
      return res.status(502).json({
        error: "Upstream fetch to RapidAPI failed",
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        upstreamBody,
      });
    }

    const upstreamPayload = await upstreamResponse.json();

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
      .json({ error: "Failed to fetch predictions from RapidAPI" });
  }
});

// ==============================
// Server Start
// ==============================
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
