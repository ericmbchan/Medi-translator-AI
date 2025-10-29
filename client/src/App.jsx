import React, { useState, useCallback, useRef } from 'react';

function App() {
  const [inputText, setInputText] = useState('');
  const [translation, setTranslation] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('mandarin');
  const [audioData, setAudioData] = useState(null);
  const [audioDetails, setAudioDetails] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const [translationDetails, setTranslationDetails] = useState(null);
  
  const audioRef = useRef(null);

  // Input validation
  const validateInput = (text) => {
    if (!text || text.trim().length === 0) {
      return 'Please enter some text to translate';
    }
    if (text.length > 2000) {
      return 'Text is too long. Please limit to 2000 characters.';
    }
    return null;
  };

  const handleTranslate = useCallback(async () => {
    const validationError = validateInput(inputText);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsTranslating(true);
    setTranslation('');
    setAudioData(null);
    setError('');
    setTranslationDetails(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: inputText.trim(),
          targetLanguage: selectedLanguage 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Translation failed');
      }

      setTranslation(data.translation);
      setTranslationDetails({
        original: data.original,
        timestamp: data.timestamp
      });
    } catch (error) {
      console.error('Translation error:', error);
      setError(error.message || 'Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }, [inputText]);

  const handleGenerateAudio = useCallback(async () => {
    if (!translation) return;

    setIsGeneratingAudio(true);
    setError('');

    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: translation,
          targetLanguage: selectedLanguage 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Audio generation failed');
      }

      setAudioData(data.audio);
      setAudioDetails({
        voiceType: data.voiceType,
        duration: data.duration,
        timestamp: data.timestamp
      });

      return data.audio; // Return audio data for immediate playback
    } catch (error) {
      console.error('Audio generation error:', error);
      setError(error.message || 'Audio generation failed. Please try again.');
      throw error; // Re-throw to handle in calling function
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [translation, selectedLanguage]);

  const handlePlayAudio = useCallback(async () => {
    if (!translation) return;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setError('');
    let audioToPlay = audioData;

    // If no audio data exists, generate it first
    if (!audioData) {
      try {
        setIsGeneratingAudio(true);
        audioToPlay = await handleGenerateAudio();
      } catch (error) {
        return; // Error already handled in handleGenerateAudio
      }
    }

    // Now play the audio
    if (audioToPlay) {
      setIsPlaying(true);

      try {
        const audio = new Audio(`data:audio/mp3;base64,${audioToPlay}`);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsPlaying(false);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setIsPlaying(false);
          audioRef.current = null;
          setError('Audio playback failed. Please try regenerating the audio.');
        };

        await audio.play();
      } catch (error) {
        setIsPlaying(false);
        setError('Audio playback failed. Please check your browser settings.');
      }
    }
  }, [translation, audioData, handleGenerateAudio, selectedLanguage]);

  const handleClear = useCallback(() => {
    setInputText('');
    setTranslation('');
    setAudioData(null);
    setAudioDetails(null);
    setError('');
    setTranslationDetails(null);
    
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    setInputText(e.target.value);
    setError(''); // Clear error when user starts typing
  }, []);

  // Quick medical categories
  const medicalCategories = [
    { 
      id: 'symptoms', 
      name: 'Symptoms', 
      icon: '🤒',
      examples: [
        "Where does it hurt?",
        "When did this pain start?",
        "How would you rate your pain from 1 to 10?",
        "Do you have any allergies?"
      ]
    },
    { 
      id: 'treatment', 
      name: 'Treatment', 
      icon: '💊',
      examples: [
        "Take this medication twice daily with food.",
        "You need to rest for 3 days.",
        "Apply ice for 15 minutes every hour.",
        "Come back if symptoms worsen."
      ]
    },
    { 
      id: 'procedures', 
      name: 'Procedures', 
      icon: '🩺',
      examples: [
        "I need to examine your throat now.",
        "We need to take an X-ray.",
        "This injection will help with the pain.",
        "Please breathe deeply while I listen to your lungs."
      ]
    }
  ];

  const [selectedCategory, setSelectedCategory] = useState('symptoms');

  // Language options
  const languageOptions = [
    { value: 'mandarin', label: '普通话 (Mandarin)', flag: '🇨🇳' },
    { value: 'cantonese', label: '廣東話 (Cantonese)', flag: '🇭🇰' }
  ];

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    // Clear existing translation and audio when language changes
    setTranslation('');
    setAudioData(null);
    setAudioDetails(null);
    setError('');
  };

  const handleExampleClick = (text) => {
    setInputText(text);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Medical Header Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Medical Translation System</h1>
                <p className="text-sm text-gray-500">Patient Communication Tool</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Target Language</p>
                <p className="text-xs text-gray-500">Select patient's preferred language</p>
              </div>
              <div className="flex rounded-md shadow-sm">
                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleLanguageChange(option.value)}
                    className={`px-4 py-2 text-sm font-medium border transition-colors ${
                      selectedLanguage === option.value
                        ? 'bg-blue-600 text-white border-blue-600 z-10'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    } ${
                      option.value === 'mandarin' ? 'rounded-l-md' : 'rounded-r-md -ml-px'
                    }`}
                    disabled={isTranslating || isGeneratingAudio}
                  >
                    {option.flag} {option.value === 'mandarin' ? 'Mandarin' : 'Cantonese'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Input */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Doctor's Message</h2>
                <p className="text-sm text-gray-500">Enter your message in English</p>
              </div>
              
              <div className="p-4">
                {/* Quick Templates */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Templates
                  </label>
                  <div className="space-y-3">
                    {medicalCategories.map((category) => (
                      <div key={category.id} className="border border-gray-200 rounded-lg">
                        <button
                          onClick={() => setSelectedCategory(category.id)}
                          className={`w-full px-3 py-2 text-left text-sm font-medium rounded-t-lg transition-colors ${
                            selectedCategory === category.id
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span className="mr-2">{category.icon}</span>
                          {category.name}
                        </button>
                        {selectedCategory === category.id && (
                          <div className="p-3 space-y-1 border-t border-gray-200">
                            {category.examples.map((example, index) => (
                              <button
                                key={index}
                                onClick={() => handleExampleClick(example)}
                                className="block w-full text-left text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                disabled={isTranslating || isGeneratingAudio}
                              >
                                "{example}"
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Text Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Message
                    </label>
                    <textarea
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder="Type your message to the patient..."
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      disabled={isTranslating}
                      maxLength={2000}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400">{inputText.length}/2000</span>
                      <span className="text-xs text-gray-400">Characters remaining</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleTranslate}
                      disabled={!inputText.trim() || isTranslating || validateInput(inputText)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
                    >
                      {isTranslating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Translating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                          Translate
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleClear}
                      disabled={isTranslating || isGeneratingAudio}
                      className="bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-700 font-medium py-2 px-4 rounded-md transition-colors duration-200"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Output */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      Patient Translation
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedLanguage === 'mandarin' ? 'Simplified Chinese (Mandarin)' : 'Traditional Chinese (Cantonese)'}
                    </p>
                  </div>
                  {translationDetails && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        Translated {new Date(translationDetails.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4">
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Translation Display */}
                {translation ? (
                  <div className="space-y-4">
                    {/* Chinese Translation */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <div className="text-center">
                        <div className="text-3xl mb-3">
                          {selectedCategory === 'treatment' ? '💊' : 
                           selectedCategory === 'procedures' ? '🩺' : '🤒'}
                        </div>
                        <p className="text-2xl font-medium text-gray-900 leading-relaxed mb-2">
                          {translation}
                        </p>
                        <p className="text-sm text-gray-600">
                          {selectedLanguage === 'mandarin' ? '普通话' : '廣東話'}
                        </p>
                      </div>
                    </div>

                    {/* Audio Controls */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-green-800">Audio Pronunciation</h3>
                          <p className="text-sm text-green-600">Play for patient to hear</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          {audioData && (
                            <div className="text-xs text-green-600">
                              ✓ Audio ready
                            </div>
                          )}
                          <button
                            onClick={handlePlayAudio}
                            disabled={isGeneratingAudio || isPlaying || !translation}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center"
                          >
                            {isGeneratingAudio ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                              </>
                            ) : isPlaying ? (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Playing...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                Play Audio
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {audioDetails && (
                        <div className="mt-3 text-xs text-green-600 border-t border-green-200 pt-2">
                          <div className="flex justify-between">
                            <span>Voice: {audioDetails.voiceType}</span>
                            <span>Duration: ~{audioDetails.duration}s</span>
                            <span>Generated: {new Date(audioDetails.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Original Message Reference */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Original Message (English)</h3>
                      <p className="text-sm text-gray-600 italic">"{inputText}"</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No translation yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Enter a message and click translate to begin</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Powered by OpenAI GPT-4
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                Google Cloud Text-to-Speech
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                Medical Translation System v1.0
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;