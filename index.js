import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

// Проверка наличия API ключа
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is not set in environment variables!');
  process.exit(1);
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Gemini proxy server is running' });
});

// Main endpoint for transcript generation
app.post('/transcript', async (req, res) => {
  try {
    console.log('Incoming request to /transcript');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      animal,
      animal_name,
      moral,
      setting,
      repeating_phrase,
    } = req.body;

    if (!animal) {
      console.warn('Missing required parameter: animal');
      return res.status(400).json({ error: 'Missing required parameter: animal' });
    }

    const systemText = `
You are a children's storyteller specializing in magical bedtime stories that gently guide children toward sleep. Create a soothing, imaginative tale featuring a ${animal} protagonist named ${animal_name || 'Whisper'}.

Story Guidelines:
- Tone: Gentle, whimsical, and heartwarming with a calming progression
- Structure: Begin with an awakening/curious moment, include a small challenge, then resolve with comfort and peace
- Moral: Weave in a subtle lesson about ${moral || 'kindness'}
- Length: 350-400 words (approximately 60 seconds when read aloud)
- Language: Use simple vocabulary with occasional lyrical phrases
- Setting: Create a vivid ${setting || 'enchanted forest'} with rich sensory details
- Pattern: Include a gentle repeating phrase like '${repeating_phrase || 'and the stars twinkled overhead'}' that appears 3 times
- Ending: Gradually wind down with sleepy imagery and a sense of peaceful resolution

Format your response as continuous narrative text suitable for reading aloud. Do not include scene headings, sound effects, narrator instructions, or structural notes.
`.trim();

    console.log('System prompt created successfully');
    
    const payload = {
      system_instruction: {
        parts: [{ text: systemText }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: animal || 'animal' }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
        topP: 0.9,
        topK: 40,
        frequencyPenalty: 0.2,
        presencePenalty: 0.15,
      },
    };

    console.log('Sending request to Gemini API...');
    console.log('Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent');
    
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      payload,
      {
        params: { key: GEMINI_API_KEY },
        timeout: 30000,
      }
    );

    console.log('Gemini API response received successfully');
    
    const candidates = response.data.candidates || [];
    const text = candidates[0]?.content?.parts?.[0]?.text || '';
    
    console.log('Transcript generated, length:', text.length);
    
    return res.json({ text });
  } catch (err) {
    console.error('Error in /transcript endpoint:');
    console.error('Status:', err.response?.status);
    console.error('Data:', JSON.stringify(err.response?.data, null, 2));
    console.error('Message:', err.message);
    
    return res.status(500).json({
      error: 'Gemini request failed',
      details: err.response?.data || err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Gemini proxy server running on port ${PORT}`);
});
