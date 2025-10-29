import React, { useState } from 'react';

function App() {
  const [inputText, setInputText] = useState('');
  const [translation, setTranslation] = useState('');
  const [audioData, setAudioData] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setIsTranslating(true);
    setTranslation('');
    setAudioData(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranslation(data.translation);
    } catch (error) {
      console.error('Translation error:', error);
      alert('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!translation) return;

    setIsGeneratingAudio(true);

    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: translation }),
      });

      if (!response.ok) {
        throw new Error('Audio generation failed');
      }

      const data = await response.json();
      setAudioData(data.audio);
    } catch (error) {
      console.error('Audio generation error:', error);
      alert('Audio generation failed. Please try again.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handlePlayAudio = () => {
    if (!audioData) return;

    setIsPlaying(true);
    const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
    
    audio.onended = () => {
      setIsPlaying(false);
    };

    audio.onerror = () => {
      setIsPlaying(false);
      alert('Audio playback failed. Please try again.');
    };

    audio.play().catch(() => {
      setIsPlaying(false);
      alert('Audio playback failed. Please try again.');
    });
  };

  const handleClear = () => {
    setInputText('');
    setTranslation('');
    setAudioData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Medical Translator
          </h1>
          <p className="text-lg text-gray-600">
            English to Authentic Cantonese
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Input Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              English Medical Text
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter English medical text to translate..."
              className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isTranslating}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleTranslate}
              disabled={!inputText.trim() || isTranslating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isTranslating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Translating...
                </>
              ) : (
                'Translate to Cantonese'
              )}
            </button>
            
            <button
              onClick={handleClear}
              disabled={isTranslating || isGeneratingAudio}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Clear
            </button>
          </div>

          {/* Translation Output */}
          {translation && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantonese Translation (Traditional Chinese)
              </label>
              <div className="w-full min-h-[120px] p-4 bg-gray-50 border border-gray-300 rounded-lg">
                <p className="text-lg leading-relaxed text-gray-800 font-chinese">
                  {translation}
                </p>
              </div>
            </div>
          )}

          {/* Audio Section */}
          {translation && (
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Audio Playback
              </label>
              
              <div className="flex gap-4">
                <button
                  onClick={handleGenerateAudio}
                  disabled={isGeneratingAudio || !translation}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  {isGeneratingAudio ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Generating Audio...
                    </>
                  ) : (
                    'Generate Audio'
                  )}
                </button>

                {audioData && (
                  <button
                    onClick={handlePlayAudio}
                    disabled={isPlaying}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  >
                    {isPlaying ? (
                      <>
                        <div className="animate-pulse h-5 w-5 bg-white rounded-full mr-2"></div>
                        Playing...
                      </>
                    ) : (
                      '🔊 Play Audio'
                    )}
                  </button>
                )}
              </div>

              {audioData && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    ✅ Audio generated successfully! Click "Play Audio" to listen.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by OpenAI GPT-4 and Google Cloud Text-to-Speech</p>
        </div>
      </div>
    </div>
  );
}

export default App;