import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import textToSpeech from '@google-cloud/text-to-speech';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Environment validation
const requiredEnvVars = ['OPENAI_API_KEY', 'GOOGLE_APPLICATION_CREDENTIALS'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

console.log('✅ Environment variables validated');

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with your actual domain
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Initialize OpenAI with error handling
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ OpenAI client initialized');
} catch (error) {
  console.error('❌ Failed to initialize OpenAI client:', error.message);
  process.exit(1);
}

// Initialize Google Cloud TTS client with error handling
let ttsClient;
try {
  ttsClient = new textToSpeech.TextToSpeechClient();
  console.log('✅ Google Cloud TTS client initialized');
} catch (error) {
  console.error('❌ Failed to initialize Google Cloud TTS client:', error.message);
  console.error('Make sure GOOGLE_APPLICATION_CREDENTIALS points to a valid service account file');
  process.exit(1);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Medical Translator API is running' });
});

// List available voices endpoint
app.get('/api/voices', async (req, res) => {
  try {
    const [result] = await ttsClient.listVoices({});
    const cantonesesVoices = result.voices.filter(voice => 
      voice.languageCodes.some(code => code.startsWith('zh-HK'))
    );
    res.json({ voices: cantonesesVoices });
  } catch (error) {
    console.error('Error listing voices:', error);
    res.status(500).json({ error: 'Failed to list voices', details: error.message });
  }
});

// Translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLanguage = 'mandarin' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Valid text is required',
        details: 'Please provide non-empty text to translate'
      });
    }

    if (text.length > 2000) {
      return res.status(400).json({ 
        error: 'Text too long',
        details: 'Please limit input to 2000 characters or less'
      });
    }

    if (!['mandarin', 'cantonese'].includes(targetLanguage)) {
      return res.status(400).json({
        error: 'Invalid target language',
        details: 'Supported languages: mandarin, cantonese'
      });
    }

    console.log(`Translation request (${targetLanguage}): "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);

    // Different prompts for different dialects
    const systemPrompts = {
      mandarin: `You are an expert medical interpreter specializing in doctor-patient communication. Your role is to translate what a doctor says in English into natural, clear, and culturally appropriate Simplified Chinese (Mandarin) that Chinese patients can easily understand.

CONTEXT: The input will be dialogue from a doctor speaking to a Chinese patient. Your translation should:

1. ACCURACY: Maintain all medical information precisely - no omissions or additions
2. CLARITY: Use simple, clear Mandarin that patients of all education levels can understand
3. CULTURAL SENSITIVITY: Adapt to mainland Chinese cultural context while preserving medical meaning
4. NATURAL TONE: Sound like how a Mandarin-speaking doctor would naturally speak to a patient
5. RESPECTFUL: Use appropriate levels of politeness and formality for healthcare settings

MEDICAL TERMINOLOGY: 
- Use commonly understood Mandarin medical terms
- When technical terms are necessary, include simple explanations
- Prioritize patient comprehension over literal translation

OUTPUT FORMAT: Simplified Chinese characters only, no explanations or notes.

Examples of good Mandarin translations:
Doctor: "Take this medication twice daily with food."
Translation: "这个药一天吃两次，记得要和食物一起服用。"

Doctor: "You have a mild fever, please rest and drink plenty of fluids."
Translation: "您有点低烧，请多休息，记得要多喝水。"`,

      cantonese: `You are an expert medical interpreter specializing in doctor-patient communication. Your role is to translate what a doctor says in English into natural, authentic Cantonese that Hong Kong patients can easily understand.

CONTEXT: The input will be dialogue from a doctor speaking to a Cantonese-speaking patient. Your translation should:

1. ACCURACY: Maintain all medical information precisely - no omissions or additions
2. AUTHENTICITY: Use genuine Hong Kong Cantonese expressions and colloquialisms
3. CULTURAL SENSITIVITY: Adapt to Hong Kong cultural context while preserving medical meaning
4. NATURAL TONE: Sound like how a Cantonese-speaking doctor would naturally speak to a patient in Hong Kong
5. RESPECTFUL: Use appropriate Cantonese honorifics and politeness levels

CANTONESE CHARACTERISTICS:
- Use Traditional Chinese characters (繁體字)
- Include authentic Cantonese particles (啊, 呀, 喇, 㗎, 咩, etc.)
- Use Cantonese-specific vocabulary and sentence structures
- Avoid Mandarin-influenced phrasing

OUTPUT FORMAT: Traditional Chinese characters with Cantonese expressions, no explanations or notes.

Examples of good Cantonese translations:
Doctor: "Take this medication twice daily with food."
Translation: "呢隻藥要一日食兩次，記住要同食物一齊食㗎。"

Doctor: "You have a mild fever, please rest and drink plenty of fluids."
Translation: "您有少少發燒，要多啲休息，記住要飲多啲水啊。"`
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompts[targetLanguage]
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent medical translations
      max_tokens: 1000,
    });

    const translation = completion.choices[0].message.content.trim();
    
    console.log(`Translation completed (${targetLanguage}): "${translation.substring(0, 100)}${translation.length > 100 ? '...' : ''}"`);

    res.json({ 
      translation,
      original: text,
      targetLanguage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Translation error:', error);
    
    // More specific error handling
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({ 
        error: 'Translation service temporarily unavailable',
        details: 'Please try again in a moment'
      });
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({ 
        error: 'Too many requests',
        details: 'Please wait a moment before trying again'
      });
    }

    res.status(500).json({ 
      error: 'Translation failed', 
      details: 'Unable to process translation request'
    });
  }
});

// Audio generation endpoint
app.post('/api/audio', async (req, res) => {
  try {
    const { text, targetLanguage = 'mandarin' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Valid text is required for audio generation',
        details: 'Please provide non-empty text to convert to speech'
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({ 
        error: 'Text too long for audio generation',
        details: 'Please limit text to 1000 characters or less'
      });
    }

    if (!['mandarin', 'cantonese'].includes(targetLanguage)) {
      return res.status(400).json({
        error: 'Invalid target language for audio',
        details: 'Supported languages: mandarin, cantonese'
      });
    }

    console.log(`Audio generation request (${targetLanguage}): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    // Enhanced SSML markup for more natural speech
    const enhancedText = `<speak>
      <prosody rate="0.85" pitch="-2st" volume="medium">
        <emphasis level="moderate">${text.trim()}</emphasis>
      </prosody>
      <break time="0.5s"/>
    </speak>`;

    // Voice configurations for different dialects
    const voiceConfigs = {
      mandarin: {
        languageCode: 'zh-CN',
        voiceOptions: [
          { name: 'zh-CN-Neural2-A', type: 'Neural2' },
          { name: 'zh-CN-Wavenet-A', type: 'Wavenet' },
          { name: null, type: 'Standard' }
        ]
      },
      cantonese: {
        languageCode: 'zh-HK',
        voiceOptions: [
          { name: 'zh-HK-Neural2-A', type: 'Neural2' },
          { name: 'zh-HK-HiuMaan', type: 'Premium' },
          { name: 'zh-HK-HiuGaai', type: 'Standard' },
          { name: null, type: 'Basic' }
        ]
      }
    };

    const config = voiceConfigs[targetLanguage];
    let audioGenerated = false;
    let lastError = null;

    // Try voice options in order of preference
    for (const voiceOption of config.voiceOptions) {
      try {
        const request = {
          input: { ssml: enhancedText },
          voice: {
            languageCode: config.languageCode,
            ...(voiceOption.name && { name: voiceOption.name }),
            ssmlGender: 'FEMALE',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.85,
            pitch: -2.0,
            volumeGainDb: 1.0,
            sampleRateHertz: 24000,
            effectsProfileId: ['telephony-class-application'],
          },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);

        if (!response.audioContent) {
          throw new Error('No audio content received from TTS service');
        }

        const audioBase64 = response.audioContent.toString('base64');
        
        console.log(`Audio generated successfully with ${voiceOption.type} voice (${targetLanguage}): ${audioBase64.length} bytes`);

        res.json({ 
          audio: audioBase64,
          contentType: 'audio/mp3',
          voiceType: `${voiceOption.type} (${targetLanguage})`,
          language: targetLanguage,
          duration: Math.ceil(text.length / 8),
          timestamp: new Date().toISOString()
        });

        audioGenerated = true;
        break;

      } catch (voiceError) {
        console.log(`${voiceOption.type} voice failed (${targetLanguage}), trying next option:`, voiceError.message);
        lastError = voiceError;
        continue;
      }
    }

    if (!audioGenerated) {
      throw lastError || new Error('All voice options failed');
    }

  } catch (error) {
    console.error('Audio generation error:', error);
    
    // More specific error handling for TTS
    if (error.code === 3) { // INVALID_ARGUMENT
      return res.status(400).json({ 
        error: 'Invalid text for audio generation',
        details: 'The text may contain unsupported characters or formatting'
      });
    }
    
    if (error.code === 7) { // PERMISSION_DENIED
      return res.status(403).json({ 
        error: 'Audio service not available',
        details: 'Text-to-speech service access is not configured'
      });
    }

    if (error.code === 8) { // RESOURCE_EXHAUSTED
      return res.status(429).json({ 
        error: 'Audio service temporarily unavailable',
        details: 'Please try again in a moment'
      });
    }

    res.status(500).json({ 
      error: 'Audio generation failed', 
      details: 'Unable to convert text to speech'
    });
  }
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server with validation
async function startServer() {
  try {
    // Test OpenAI connection
    await openai.models.list();
    console.log('✅ OpenAI API connection verified');

    // Test Google Cloud TTS connection
    await ttsClient.listVoices({ languageCode: 'zh-CN' });
    console.log('✅ Google Cloud TTS connection verified');

    const server = app.listen(PORT, () => {
      console.log('\n🚀 Medical Translator Server Started Successfully!');
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`� Translation: POST http://localhost:${PORT}/api/translate`);
      console.log(`🔊 Audio: POST http://localhost:${PORT}/api/audio`);
      console.log(`🏥 Health: GET http://localhost:${PORT}/api/health`);
      console.log(`📋 Voices: GET http://localhost:${PORT}/api/voices`);
      console.log(`\n✨ Ready for doctor-patient translations!\n`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.error('Please try a different port or stop the conflicting process');
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    console.error('Please check your API credentials and network connection');
    process.exit(1);
  }
}

startServer();
