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
const SPORTRADAR_API_KEY = process.env.SPORTRADAR_API_KEY;
const SPORTRADAR_BASE_URL =
  process.env.SPORTRADAR_BASE_URL || "https://api.sportradar.com";

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
 * Build Sportradar URL for predictions by sport.
 * Adjust path/query to match actual Sportradar API.
 */
function buildSportradarUrlForPredictions(sport) {
  const url = new URL(`${SPORTRADAR_BASE_URL}/predictions`);
  url.searchParams.set("sport", sport);
  return url.toString();
}

/**
 * Normalize upstream payload into a stable schema for the frontend.
 * Keep raw under data until you finalize mapping.
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
 * Replace with your real logic when ready.
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

/**
 * Root route — friendly landing page
 */
app.get("/", (req, res) => {
  res.send(
    "Backend is live 🎉 Try /health, /api/supported-sports, or /api/predictions-by-sport?sport=football"
  );
});

/**
 * Health check — useful for monitoring and diagnostics.
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});

/**
 * Enumerate supported sports — allows frontend to bootstrap selectors.
 */
app.get("/api/supported-sports", (req, res) => {
  res.json({ sports: Array.from(SUPPORTED_SPORTS) });
});

/**
 * Subscription plans — front-end driven display, static for now.
 * Replace with DB or billing API later.
 */
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

    // Validate sport query
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

    if (!SPORTRADAR_API_KEY) {
      return res.status(500).json({
        error: "SPORTRADAR_API_KEY is not configured on the server",
      });
    }

    // Build upstream request to Sportradar
    const url = buildSportradarUrlForPredictions(sport);
    const upstreamResponse = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SPORTRADAR_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    // Handle non-2xx upstream responses
    if (!upstreamResponse.ok) {
      const upstreamBody = await upstreamResponse
        .text()
        .catch(() => "Unable to read upstream response body");
      return res.status(502).json({
        error: "Upstream fetch to Sportradar failed",
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        upstreamBody,
      });
    }

    // Parse upstream payload
    const upstreamPayload = await upstreamResponse.json();

    // Normalize and add expert conclusion
    const normalized = normalizePredictionsResponse(sport, upstreamPayload);
    normalized.expertConclusion = generateExpertConclusion(
      sport,
      upstreamPayload
    );

    // Optional caching for slight performance
    res.set("Cache-Control", "public, max-age=30");

    return res.json(normalized);
  } catch (err) {
    console.error("Error in /api/predictions-by-sport:", err);
    return res
      .status(500)
      .json({ error: "Failed to fetch predictions from Sportradar" });
  }
});

// ==============================
// Server Start
// ==============================
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
