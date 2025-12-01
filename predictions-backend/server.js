// server.js
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());

// CORS for all routes
app.use(cors());

// ✅ FIX: Express 5 no longer supports "*" — use "/*" instead
app.options('/*', cors());

// Example predictions endpoint
app.get('/api/predictions', (req, res) => {
  res.json({
    predictions: [
      { id: 1, title: "Team A will win", confidence: 0.75 },
      { id: 2, title: "Player X will score", confidence: 0.65 }
    ]
  });
});

// ✅ Catch‑all route (also updated for Express 5)
app.get('/*', (req, res) => {
  res.json({ message: "Backend is running" });
});

// Render uses PORT from environment
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
