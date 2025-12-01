const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Always set CORS headers (fixes Render cold-start issues)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// ✅ CORS middleware
app.use(cors());
app.options('*', cors());

app.use(express.json());

// ✅ Root route
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// ✅ Predictions API route
app.get('/api/predictions', (req, res) => {
  const predictions = [
    { id: 1, title: 'Team A will win', confidence: 0.75 },
    { id: 2, title: 'Player X will score', confidence: 0.65 },
  ];
  res.json({ predictions });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
