import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import textToSpeech from '@google-cloud/text-to-speech';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Google Cloud TTS client
const ttsClient = new textToSpeech.TextToSpeechClient();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Medical Translator API is running' });
});

// Translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Uncomment this when OpenAI billing is ready:
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a native Cantonese speaker from Hong Kong working as a medical interpreter. Translate English medical text to natural, conversational Cantonese as you would speak to a patient in person. Use authentic Hong Kong Cantonese expressions and phrasing, not literal translation. Write in traditional Chinese characters.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7,
    });

    const translation = completion.choices[0].message.content;
    

    res.json({ translation }); // Use the real OpenAI translation
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      error: 'Translation failed', 
      details: error.message 
    });
  }
});

// Audio generation endpoint
app.post('/api/audio', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Configure the TTS request
    const request = {
      input: { text },
      voice: {
        languageCode: 'zh-HK',
        name: 'zh-HK-Standard-A',
        ssmlGender: 'FEMALE',
      },
      audioConfig: {
        audioEncoding: 'MP3',
      },
    };

    // Perform the text-to-speech request
    const [response] = await ttsClient.synthesizeSpeech(request);

    // Convert audio content to base64
    const audioBase64 = response.audioContent.toString('base64');

    res.json({ 
      audio: audioBase64,
      contentType: 'audio/mp3'
    });
  } catch (error) {
    console.error('Audio generation error:', error);
    res.status(500).json({ 
      error: 'Audio generation failed', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Translation endpoint: POST http://localhost:${PORT}/api/translate`);
  console.log(`🔊 Audio endpoint: POST http://localhost:${PORT}/api/audio`);
});
