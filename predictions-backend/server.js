const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: "*", // allow ALL origins
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.get('/api/predictions', (req, res) => {
  const predictions = [
    { id: 1, title: 'Team A will win', confidence: 0.75 },
    { id: 2, title: 'Player X will score', confidence: 0.65 },
  ];
  res.json({ predictions });
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});