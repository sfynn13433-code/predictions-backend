const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

// ✅ FIX: Express 5 requires regex for wildcard routes
app.options(/.*/, cors());

// Your predictions endpoint
app.get('/api/predictions', (req, res) => {
  res.json({
    predictions: [
      { id: 1, title: "Team A will win", confidence: 0.75 },
      { id: 2, title: "Player X will score", confidence: 0.65 }
    ]
  });
});

// ✅ FIX: Catch-all route must also use regex
app.get(/.*/, (req, res) => {
  res.json({ message: "Backend is running" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
