# Medical Translation App - English to Cantonese

A minimal medical translation app that converts English medical text to authentic Cantonese voice using OpenAI GPT-4 and Google Cloud Text-to-Speech.

## Features

- 🏥 **Medical Translation**: Converts English medical text to natural, conversational Cantonese
- 🗣️ **Authentic Voice**: Uses Google Cloud TTS with native Cantonese voice (zh-HK-Standard-A)
- 🎯 **Hong Kong Style**: Translations use authentic Hong Kong Cantonese expressions
- 📱 **Simple UI**: Clean, medical-focused interface with loading states
- 🎵 **Audio Playback**: Generate and play Cantonese audio pronunciations

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **APIs**: OpenAI GPT-4 + Google Cloud Text-to-Speech

## Setup Instructions

### 1. Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 2. Set up OpenAI API

1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Update `.env` file:
   ```
   OPENAI_API_KEY=your_actual_openai_key_here
   ```

### 3. Set up Google Cloud Text-to-Speech

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Text-to-Speech API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Cloud Text-to-Speech API"
   - Click "Enable"

3. **Create Service Account**:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name like "tts-service-account"
   - Grant role: "Cloud Text-to-Speech Client"
   - Click "Done"

4. **Download Credentials**:
   - Click on your service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Download and save as `server/google-credentials.json`

5. **Verify .env file**:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./server/google-credentials.json
   ```

### 4. Run the Application

```bash
# Start the backend server (Terminal 1)
npm run server

# Start the frontend development server (Terminal 2)
npm run client
```

- Backend runs on: http://localhost:3001
- Frontend runs on: http://localhost:3000

## API Endpoints

### POST /api/translate
Translates English medical text to Cantonese.

**Request:**
```json
{
  "text": "Take this medication twice daily with food"
}
```

**Response:**
```json
{
  "translation": "呢隻藥一日食兩次，要同埋食物一齊食"
}
```

### POST /api/audio
Generates Cantonese audio from text.

**Request:**
```json
{
  "text": "呢隻藥一日食兩次，要同埋食物一齊食"
}
```

**Response:**
```json
{
  "audio": "base64_encoded_mp3_data",
  "contentType": "audio/mp3"
}
```

## Usage

1. Enter English medical text in the input area
2. Click "Translate to Cantonese" to get the translation
3. Click "Generate Audio" to create Cantonese pronunciation
4. Click "Play Audio" to listen to the translation

## Cost Considerations

- **OpenAI GPT-4**: ~$0.03 per 1K tokens (input) + $0.06 per 1K tokens (output)
- **Google Cloud TTS**: Free tier includes 1 million characters per month
- Both services offer generous free tiers for development/testing

## Troubleshooting

1. **Translation fails**: Check OpenAI API key and account credits
2. **Audio generation fails**: Verify Google Cloud credentials and API enabled
3. **CORS errors**: Ensure backend is running on port 3001
4. **Build errors**: Run `npm install` in both root and client directories

## File Structure

```
├── package.json           # Server dependencies & scripts
├── .env                   # Environment variables
├── server/
│   ├── server.js         # Express server with API endpoints
│   └── google-credentials.json  # Google Cloud service account key
└── client/
    ├── package.json      # Client dependencies
    ├── vite.config.js    # Vite configuration
    ├── tailwind.config.js # Tailwind CSS config
    ├── src/
    │   ├── main.jsx      # React entry point
    │   ├── App.jsx       # Main UI component
    │   └── index.css     # Tailwind CSS imports
    └── index.html        # HTML template
```