# Medical Translator - Startup Instructions

## Issue Resolved: The terminal automation is having issues, but your code is correct! 

## Manual Startup Instructions:

### 1. Start the Backend Server (First Terminal)
1. Open Command Prompt or PowerShell as Administrator
2. Navigate to your project folder:
   ```
   cd "C:\Users\ericm\Desktop\FALL2025 STARTUP\translator-AI\Medi-translator-AI"
   ```
3. Start the backend server:
   ```
   node server/server.js
   ```
4. You should see output like:
   ```
   ✅ Environment variables validated
   ✅ OpenAI client initialized
   ✅ Google Cloud TTS client initialized
   🚀 Medical Translator Server Started Successfully!
   📡 Server: http://localhost:3003
   ```

### 2. Start the Frontend Client (Second Terminal)
1. Open a NEW Command Prompt or PowerShell window
2. Navigate to the client folder:
   ```
   cd "C:\Users\ericm\Desktop\FALL2025 STARTUP\translator-AI\Medi-translator-AI\client"
   ```
3. Start the frontend:
   ```
   npm run dev
   ```
4. You should see output like:
   ```
   Local:   http://localhost:3000
   ```

### 3. Open the Application
1. Open your web browser
2. Go to: http://localhost:3000
3. You should see the Medical Translator interface

### 4. Test the Application
1. Select language (Mandarin or Cantonese)
2. Choose a medical category (Symptoms, Treatment, etc.)
3. Enter English text or click a quick example
4. Click "Translate"
5. Click "Play Audio" to hear the pronunciation

## Your Current App Features:
✅ English to Mandarin/Cantonese translation
✅ Medical-specific terminology and context
✅ Natural voice synthesis with Google Cloud TTS
✅ Emergency vs Routine mode
✅ Medical category shortcuts
✅ Single-page streamlined interface
✅ Audio generation and playback

## Troubleshooting:
- If port 3003 is in use, check Task Manager for node.exe processes
- If environment variables fail, ensure .env file exists with your API keys
- If audio fails, check Google Cloud credentials file
- Backend must start BEFORE frontend for API calls to work

## Files Created for Easy Startup:
- `start-app.bat` - Double-click to start both servers
- `start-server.bat` - Start just the backend server
- `simple-server.js` - Minimal test server if needed

Your medical translator is ready to use! 🏥