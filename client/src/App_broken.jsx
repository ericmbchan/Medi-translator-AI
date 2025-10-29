import React, { useState, useCallback } from 'react';

function App() {
  const [inputText, setInputText] = useState('');
  const [translation, setTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const [audioData, setAudioData] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('mandarin');
  const [selectedCategory, setSelectedCategory] = useState('symptoms');
  const [translationDetails, setTranslationDetails] = useState(null);
  const [audioDetails, setAudioDetails] = useState(null);
  
  // Enhanced state for medical context
  const [patientContext, setPatientContext] = useState({
    age: '',
    gender: '',
    conditions: [],
    medications: [],
    visitReason: ''
  });
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showContextPanel, setShowContextPanel] = useState(false);

  const validateInput = (text) => {
    if (!text || text.trim().length === 0) {
      return 'Please enter some text to translate.';
    }
    if (text.length > 2000) {
      return 'Text is too long. Please keep it under 2000 characters.';
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
    setError('');
    setTranslation('');
    setAudioData(null);
    setTranslationDetails(null);
    setAudioDetails(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: inputText, 
          language: selectedLanguage, 
          category: selectedCategory,
          patientContext,
          conversationHistory: conversationHistory.slice(-3)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTranslation(data.translation);
      setTranslationDetails({
        timestamp: Date.now(),
        language: selectedLanguage,
        category: selectedCategory
      });

      // Add to conversation history
      setConversationHistory(prev => [...prev, {
        id: Date.now(),
        original: inputText,
        translated: data.translation,
        language: selectedLanguage,
        timestamp: Date.now()
      }]);

    } catch (error) {
      console.error('Translation error:', error);
      setError('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }, [inputText, selectedLanguage, selectedCategory, patientContext, conversationHistory]);

  const handleGenerateAudio = useCallback(async () => {
    if (!translation) return;

    setIsGeneratingAudio(true);
    setError('');
    setAudioData(null);

    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: translation, 
          language: selectedLanguage,
          category: selectedCategory,
          patientContext
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioData(audioUrl);
      setAudioDetails({
        voiceType: selectedLanguage === 'mandarin' ? 'Neural2' : 'WaveNet',
        duration: Math.ceil(translation.length / 15),
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Audio generation error:', error);
      setError('Audio generation failed. Please try again.');
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [translation, selectedLanguage, selectedCategory, patientContext]);

  const handlePlayAudio = useCallback(async () => {
    if (audioData) {
      setIsPlaying(true);
      const audio = new Audio(audioData);
      
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      audio.onerror = () => {
        setError('Audio playback failed. Please try again.');
        setIsPlaying(false);
      };
      
      try {
        await audio.play();
      } catch (error) {
        console.error('Audio playback error:', error);
        setError('Audio playback failed. Please try again.');
        setIsPlaying(false);
      }
    } else {
      await handleGenerateAudio();
    }
  }, [audioData, handleGenerateAudio]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    setError('');
  };

  const handleClear = () => {
    setInputText('');
    setTranslation('');
    setError('');
    setAudioData(null);
    setTranslationDetails(null);
    setAudioDetails(null);
  };

  const languageOptions = [
    { value: 'mandarin', label: 'Mandarin Chinese (普通话)', flag: '🇨🇳' },
    { value: 'cantonese', label: 'Cantonese Chinese (粵語)', flag: '🇭🇰' }
  ];

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
    },
    { 
      id: 'emergency', 
      name: 'Emergency', 
      icon: '🚨',
      examples: [
        "Are you having trouble breathing?",
        "Do you have chest pain?",
        "When did you last eat?",
        "Are you taking any medications?"
      ]
    }
  ];

  const handleExampleClick = (text) => {
    setInputText(text);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏥 Medical Translator
          </h1>
          <p className="text-lg text-gray-600">
            Doctor-to-Patient Communication
          </p>
          <p className="text-sm text-gray-500 mt-1">
            English to Chinese (Mandarin & Cantonese)
          </p>
          
          {/* Emergency Quick Access */}
          <div className="mt-4">
            <button
              onClick={() => {
                setSelectedCategory('emergency');
                setInputText('Are you having trouble breathing?');
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold text-sm mr-3"
            >
              🚨 EMERGENCY MODE
            </button>
            <button
              onClick={() => {
                setSelectedCategory('symptoms');
                setInputText('');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium text-sm"
            >
              📋 ROUTINE VISIT
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Target Language:
            </label>
            <div className="flex gap-4">
              {languageOptions.map((option) => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="language"
                    value={option.value}
                    checked={selectedLanguage === option.value}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {option.flag} {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Patient Context Panel */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg">
            <button
              onClick={() => setShowContextPanel(!showContextPanel)}
              className="w-full p-4 text-left font-medium text-gray-700 hover:bg-gray-50 rounded-t-xl"
            >
              📋 Patient Context {showContextPanel ? '▼' : '▶'}
            </button>
            
            {showContextPanel && (
              <div className="p-4 border-t border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <input
                    type="number"
                    placeholder="Age"
                    value={patientContext.age}
                    onChange={(e) => setPatientContext(prev => ({...prev, age: e.target.value}))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <select
                    value={patientContext.gender}
                    onChange={(e) => setPatientContext(prev => ({...prev, gender: e.target.value}))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Visit Reason"
                    value={patientContext.visitReason}
                    onChange={(e) => setPatientContext(prev => ({...prev, visitReason: e.target.value}))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => setPatientContext({age: '', gender: '', conditions: [], medications: [], visitReason: ''})}
                    className="px-3 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600"
                  >
                    Clear
                  </button>
                </div>
                
                <div className="text-xs text-gray-600">
                  💡 Patient context helps provide more accurate, personalized translations
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">
              ⚠️ {error}
            </p>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Medical Categories */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Medical Categories:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {medicalCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    selectedCategory === category.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                  disabled={isTranslating || isGeneratingAudio}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{category.icon}</div>
                    <div className="text-sm font-medium">{category.name}</div>
                  </div>
                </button>
              ))}
            </div>
            
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Examples - {medicalCategories.find(c => c.id === selectedCategory)?.name}:
            </label>
            <div className="flex flex-wrap gap-2">
              {medicalCategories.find(c => c.id === selectedCategory)?.examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  className="text-sm bg-gray-100 hover:bg-blue-100 text-gray-700 px-3 py-2 rounded-lg transition-colors duration-200"
                  disabled={isTranslating || isGeneratingAudio}
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>

          {/* Input Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your message in English:
            </label>
            <div className="relative">
              <textarea
                value={inputText}
                onChange={handleInputChange}
                placeholder="Enter what you want to communicate to your Chinese patient..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isTranslating}
                maxLength={2000}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {inputText.length}/2000
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleTranslate}
              disabled={!inputText.trim() || isTranslating || validateInput(inputText)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isTranslating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Translating...
                </>
              ) : (
                `🔤 Translate to ${selectedLanguage === 'mandarin' ? 'Mandarin' : 'Cantonese'}`
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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Patient Translation ({selectedLanguage === 'mandarin' ? 'Mandarin Chinese' : 'Cantonese Chinese'})
                </label>
                {translationDetails && (
                  <span className="text-xs text-gray-500">
                    Translated at {new Date(translationDetails.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="w-full min-h-[120px] p-6 bg-gray-50 border border-gray-300 rounded-lg">
                <div className="text-center mb-3">
                  <div className="text-2xl mb-2">
                    {selectedCategory === 'emergency' ? '🚨' : 
                     selectedCategory === 'treatment' ? '💊' : 
                     selectedCategory === 'procedures' ? '🩺' : '🤒'}
                  </div>
                </div>
                <p className="text-xl leading-relaxed text-gray-800 font-chinese text-center">
                  {translation}
                </p>
              </div>
            </div>
          )}

          {/* Audio Section */}
          {translation && (
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                🔊 Audio Pronunciation
              </label>
              
              <div className="flex gap-4">
                <button
                  onClick={handlePlayAudio}
                  disabled={isGeneratingAudio || isPlaying || !translation}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  {isGeneratingAudio ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Generating Audio...
                    </>
                  ) : isPlaying ? (
                    <>
                      <div className="animate-pulse h-5 w-5 bg-white rounded-full mr-2"></div>
                      Playing...
                    </>
                  ) : (
                    '🔊 Play Audio'
                  )}
                </button>
              </div>

              {audioData && !error && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    ✅ Audio generated successfully! The audio is ready for playback.
                  </p>
                  {audioDetails && (
                    <div className="mt-2 text-xs text-green-600">
                      <span className="font-medium">Voice:</span> {audioDetails.voiceType} • 
                      <span className="font-medium"> Duration:</span> ~{audioDetails.duration}s •
                      <span className="font-medium"> Generated:</span> {new Date(audioDetails.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-700">📝 Conversation History</h3>
              <button
                onClick={() => setConversationHistory([])}
                className="text-xs text-gray-500 hover:text-red-600"
              >
                Clear History
              </button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {conversationHistory.slice(-5).map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">
                    🇺🇸 {item.original}
                  </div>
                  <div className="text-sm text-gray-800 font-medium">
                    {item.language === 'mandarin' ? '🇨🇳' : '🇭🇰'} {item.translated}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by OpenAI GPT-4 and Google Cloud Text-to-Speech</p>
          <p className="mt-1">Designed for healthcare professionals</p>
        </div>
      </div>
    </div>
  );
}

export default App;