require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
// Use a single, hardcoded Groq OpenAI-compatible endpoint to avoid env URL mismatches
const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY is not set in environment. Set GROQ_API_KEY in .env');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running with Groq Llama model' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Tragency-AI Backend', endpoint: '/generate', model: 'llama-3.3-70b-versatile' });
});

app.post('/generate', async (req, res) => {
  const prompt = req.body.prompt;

  try {
    if (!GROQ_API_KEY) {
      console.error('Missing GROQ_API_KEY');
      return res.status(500).json({ error: 'GROQ_API_KEY is not set on the server.' });
    }

    const response = await axios.post(
      GROQ_API_ENDPOINT,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Normalize Groq/OpenAI-style response to the Gemini-like shape the frontend expects
    const aiText = response.data?.choices?.[0]?.message?.content || response.data?.choices?.[0]?.text || (typeof response.data === 'string' ? response.data : JSON.stringify(response.data));

    const geminiLike = {
      candidates: [
        {
          content: {
            parts: [ { text: aiText } ]
          }
        }
      ],
      raw: response.data
    };

    return res.json(geminiLike);
  } catch (error) {
    console.error('Groq request failed:', error.response?.status, error.response?.data || error.message);
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: error.message };
    return res.status(status).json({ error: data });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
