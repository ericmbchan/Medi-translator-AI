import React, { useState, useCallback, useRef, useEffect } from 'react';

function App() {
  const [inputText, setInputText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('mandarin');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [error, setError] = useState('');
  
  // Conversation History - Core Feature
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState('doctor'); // 'doctor' or 'patient'
  const [sessionStarted, setSessionStarted] = useState(false);
  
  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  
  // Audio management
  const [audioCache, setAudioCache] = useState({}); // Cache audio for each message
  const [playingMessageId, setPlayingMessageId] = useState(null);
  
  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      
      // Set language based on current speaker and selected language
      // Using more specific language codes for better accuracy
      if (currentSpeaker === 'patient') {
        // For Chinese patients - use more specific language variants
        if (selectedLanguage === 'mandarin') {
          recognition.lang = 'zh-CN'; // Simplified Chinese (Mandarin)
        } else {
          recognition.lang = 'zh-HK'; // Traditional Chinese (Cantonese, Hong Kong)
        }
      } else {
        recognition.lang = 'en-US'; // English for doctors
      }
      
      console.log(`Setting speech recognition language to: ${recognition.lang} for ${currentSpeaker} (${selectedLanguage})`);
      
      recognition.onstart = () => {
        setIsListening(true);
        setError('');
        console.log(`Speech recognition started with language: ${recognition.lang}`);
      };
      
      recognition.onresult = (event) => {
        console.log('Speech recognition results:', event.results);
        
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        // Show interim results for better user feedback
        if (finalTranscript) {
          setInputText(finalTranscript.trim());
          setIsListening(false);
          console.log('Final transcript:', finalTranscript);
        } else if (interimTranscript) {
          setInputText(interimTranscript.trim());
          console.log('Interim transcript:', interimTranscript);
        }
      };
      
      recognition.onerror = (event) => {
        setIsListening(false);
        console.error('Speech recognition error:', event.error);
        
        switch (event.error) {
          case 'no-speech':
            setError('No speech detected. Please try speaking again.');
            break;
          case 'not-allowed':
          case 'permission-denied':
            setError('Microphone access denied. Please click the microphone icon in your browser\'s address bar and allow access.');
            break;
          case 'audio-capture':
            setError('Cannot access microphone. Please check: 1) Another app isn\'t using your microphone, 2) Your microphone is connected, 3) Try refreshing the page.');
            break;
          case 'network':
            setError('Network error. Please check your internet connection.');
            break;
          case 'service-not-allowed':
            setError('Speech recognition service not available. This feature requires HTTPS or localhost.');
            break;
          case 'aborted':
            // User manually stopped, don't show error
            break;
          default:
            setError(`Speech recognition error: ${event.error}. Please try again or type your message instead.`);
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      setSpeechRecognition(recognition);
      setSpeechSupported(true);
    } else {
      setSpeechSupported(false);
    }
  }, [currentSpeaker, selectedLanguage]);

  // Update speech recognition language when speaker or language changes
  useEffect(() => {
    if (speechRecognition) {
      let newLang;
      if (currentSpeaker === 'patient') {
        // For Chinese patients - use more specific language variants
        newLang = selectedLanguage === 'mandarin' ? 'zh-CN' : 'zh-HK';
      } else {
        newLang = 'en-US'; // English for doctors
      }
      
      speechRecognition.lang = newLang;
      console.log(`Updated speech recognition language to: ${newLang} for ${currentSpeaker} (${selectedLanguage})`);
    }
  }, [currentSpeaker, selectedLanguage, speechRecognition]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Start voice input
  const startListening = useCallback(async () => {
    if (!speechRecognition || !speechSupported) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    try {
      // Check microphone permission first
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop the stream immediately - we just needed to check permission
          stream.getTracks().forEach(track => track.stop());
        } catch (permissionError) {
          console.error('Microphone permission error:', permissionError);
          setError('Please allow microphone access to use voice input. Click the microphone icon in your browser\'s address bar.');
          return;
        }
      }

      setInputText(''); // Clear current text
      setError(''); // Clear any previous errors
      speechRecognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Failed to start voice input. Please try again.');
    }
  }, [speechRecognition, speechSupported]);

  // Stop voice input
  const stopListening = useCallback(() => {
    if (speechRecognition) {
      speechRecognition.stop();
    }
  }, [speechRecognition]);

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

  // Start a new medical interpretation session
  const startSession = () => {
    setSessionStarted(true);
    setConversationHistory([{
      id: Date.now(),
      type: 'system',
      message: 'Medical interpretation session started',
      timestamp: new Date(),
      language: selectedLanguage
    }]);
  };

  // Add message to conversation history
  const addToConversation = (originalText, translatedText, speaker, hasAudio = false) => {
    const messageId = Date.now();
    const newMessage = {
      id: messageId,
      type: 'conversation',
      speaker: speaker, // 'doctor' or 'patient'
      originalText: originalText,
      translatedText: translatedText,
      originalLanguage: speaker === 'doctor' ? 'English' : selectedLanguage,
      translatedLanguage: speaker === 'doctor' ? selectedLanguage : 'English',
      timestamp: new Date(),
      hasAudio: hasAudio,
      audioGenerated: false
    };
    
    setConversationHistory(prev => [...prev, newMessage]);
    return messageId;
  };

  const handleTranslate = useCallback(async () => {
    const validationError = validateInput(inputText);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!sessionStarted) {
      startSession();
    }

    setIsTranslating(true);
    setError('');

    try {
      // Determine translation direction based on current speaker
      const translationRequest = {
        text: inputText.trim(),
        currentSpeaker: currentSpeaker,  // Add speaker info
        targetLanguage: selectedLanguage  // Keep for language selection
      };

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(translationRequest),
      });

      if (!response.ok) {
        if (response.status === 0 || response.status >= 500) {
          throw new Error('Server is not running. Please start the backend server first.');
        }
        throw new Error(`Server error: ${response.status}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Server returned invalid response. Please check if the backend server is running properly.');
      }

      if (data.error) {
        throw new Error(data.details || data.error || 'Translation failed');
      }

      // Add message to conversation history
      const messageId = addToConversation(
        inputText.trim(), 
        data.translation, 
        currentSpeaker,
        true
      );

      // Auto-generate audio for the translation
      setTimeout(() => {
        generateAudioForMessage(messageId, data.translation);
      }, 100);

      // Clear input and switch speaker
      setInputText('');
      
    } catch (error) {
      console.error('Translation error:', error);
      setError(error.message || 'Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }, [inputText, selectedLanguage, currentSpeaker, sessionStarted]);

  // Generate audio for a specific message
  const generateAudioForMessage = useCallback(async (messageId, text) => {
    if (!text || audioCache[messageId]) return;

    setIsGeneratingAudio(true);

    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: text,
          targetLanguage: selectedLanguage 
        }),
      });

      if (!response.ok) {
        if (response.status === 0 || response.status >= 500) {
          throw new Error('Audio server is not running.');
        }
        throw new Error(`Audio server error: ${response.status}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse audio JSON response:', jsonError);
        throw new Error('Audio server returned invalid response.');
      }

      if (data.error) {
        throw new Error(data.details || data.error || 'Audio generation failed');
      }

      // Handle demo mode - use browser TTS if no audio data
      if (data.demoMode && !data.audio) {
        console.log('Demo mode: Using browser text-to-speech for:', text);
        
        // Mark audio as "generated" for demo purposes
        setConversationHistory(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, audioGenerated: true, demoAudio: true }
              : msg
          )
        );
        return; // Exit early for demo mode
      }

      // Cache the audio only if we have actual audio data
      if (data.audio) {
        setAudioCache(prev => ({
          ...prev,
          [messageId]: data.audio
        }));

        // Update message to show audio is ready
        setConversationHistory(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, audioGenerated: true }
              : msg
          )
        );
      }

    } catch (error) {
      console.error('Audio generation error:', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [selectedLanguage]);

  // Play audio for a specific message
  const playMessageAudio = useCallback(async (messageId) => {
    // Find the message to get its text and language info
    const message = conversationHistory.find(msg => msg.id === messageId);
    if (!message) return;

    const audioData = audioCache[messageId];
    
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    // Stop any speech synthesis that might be playing
    if ('speechSynthesis' in window && speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    
    // Stop any speech synthesis that might be playing
    if ('speechSynthesis' in window && speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    setPlayingMessageId(messageId);

    try {
      // If we have cached audio data, play it
      if (audioData) {
        const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
        audioRef.current = audio;
        
        audio.onended = () => {
          setPlayingMessageId(null);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setPlayingMessageId(null);
          audioRef.current = null;
          setError('Audio playback failed.');
        };

        await audio.play();
      }
      // Demo mode: Use browser Text-to-Speech
      else if (message.demoAudio && 'speechSynthesis' in window) {
        console.log('Playing demo audio using browser TTS for:', message.translatedText);
        
        const utterance = new SpeechSynthesisUtterance(message.translatedText);
        
        // Set language based on the translation language
        if (message.translatedLanguage === 'mandarin') {
          utterance.lang = 'zh-CN';
        } else if (message.translatedLanguage === 'cantonese') {
          utterance.lang = 'zh-HK';
        } else {
          utterance.lang = 'en-US';
        }
        
        utterance.rate = 0.8; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        utterance.onend = () => {
          setPlayingMessageId(null);
        };
        
        utterance.onerror = (error) => {
          console.error('TTS Error:', error);
          setPlayingMessageId(null);
          setError('Demo audio playback failed.');
        };
        
        speechSynthesis.speak(utterance);
      }
      // No audio available
      else {
        setPlayingMessageId(null);
        setError('No audio available for this message.');
      }
    } catch (error) {
      console.error('Audio playbook error:', error);
      setPlayingMessageId(null);
      setError('Audio playback failed. Please check your browser settings.');
    }
  }, [audioCache, conversationHistory]);

  // Clear conversation and start fresh
  const clearSession = () => {
    setConversationHistory([]);
    setSessionStarted(false);
    setInputText('');
    setError('');
    setAudioCache({});
    setPlayingMessageId(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (error) setError('');
  };

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
    setError('');
  };

  const handleExampleClick = (text) => {
    setInputText(text);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Medical Interpreter Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Medical Interpreter</h1>
                <p className="text-sm text-gray-500">
                  {sessionStarted ? (
                    <span className="text-green-600 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      Session Active - {conversationHistory.filter(m => m.type === 'conversation').length} exchanges
                    </span>
                  ) : (
                    'Ready to start interpretation session'
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Speaker Toggle */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrentSpeaker('doctor')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    currentSpeaker === 'doctor'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  👨‍⚕️ Doctor
                </button>
                <button
                  onClick={() => setCurrentSpeaker('patient')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    currentSpeaker === 'patient'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🏥 Patient
                </button>
              </div>

              {/* Language Selection */}
              <div className="flex rounded-md shadow-sm">
                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleLanguageChange(option.value)}
                    className={`px-3 py-2 text-sm font-medium border transition-colors ${
                      selectedLanguage === option.value
                        ? 'bg-blue-600 text-white border-blue-600 z-10'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    } ${
                      option.value === 'mandarin' ? 'rounded-l-md' : 'rounded-r-md -ml-px'
                    }`}
                    disabled={isTranslating || isGeneratingAudio}
                  >
                    {option.flag}
                  </button>
                ))}
              </div>

              {/* Session Controls */}
              {sessionStarted && (
                <button
                  onClick={clearSession}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  End Session
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-screen">
          
          {/* Left Sidebar - Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow border border-gray-200 h-full">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Quick Phrases</h2>
                <p className="text-sm text-gray-500">Common medical expressions</p>
              </div>
              
              <div className="p-4 space-y-4 overflow-y-auto">
                {medicalCategories.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                      {category.name}
                    </h3>
                    <div className="space-y-1">
                      {category.examples.slice(0, 3).map((example, index) => (
                        <button
                          key={index}
                          onClick={() => handleExampleClick(example)}
                          className="block w-full text-left text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                          disabled={isTranslating}
                        >
                          "{example}"
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Conversation Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow border border-gray-200 h-full flex flex-col">
              
              {/* Conversation History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!sessionStarted ? (
                  <div className="text-center py-12">
                    <div className="bg-blue-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Interpret</h3>
                    <p className="text-gray-500 mb-4">Start typing a message to begin the medical interpretation session</p>
                    <div className="text-sm text-gray-400">
                      Current speaker: <span className="font-medium text-gray-600">
                        {currentSpeaker === 'doctor' ? '👨‍⚕️ Doctor' : '🏥 Patient'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {conversationHistory.map((message) => (
                      <div key={message.id}>
                        {message.type === 'system' ? (
                          <div className="text-center">
                            <div className="bg-gray-100 rounded-lg px-4 py-2 inline-block">
                              <p className="text-sm text-gray-600">
                                🏥 {message.message} • Target: {selectedLanguage === 'mandarin' ? '普通话' : '廣東話'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className={`flex ${message.speaker === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md rounded-lg p-4 ${
                              message.speaker === 'doctor'
                                ? 'bg-blue-600 text-white'
                                : 'bg-green-100 text-gray-900'
                            }`}>
                              {/* Speaker Label */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium opacity-75">
                                  {message.speaker === 'doctor' ? '👨‍⚕️ Doctor' : '🏥 Patient'} 
                                  ({message.originalLanguage})
                                </span>
                                <span className="text-xs opacity-75">
                                  {message.timestamp.toLocaleTimeString()}
                                </span>
                              </div>

                              {/* Original Message */}
                              <p className="text-sm mb-3 font-medium">
                                {message.originalText}
                              </p>

                              {/* Translation */}
                              <div className={`border-t pt-3 ${
                                message.speaker === 'doctor' ? 'border-blue-400' : 'border-green-300'
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium opacity-75">
                                    🔄 Translation ({message.translatedLanguage})
                                  </span>
                                  {message.audioGenerated && (
                                    <button
                                      onClick={() => playMessageAudio(message.id)}
                                      disabled={playingMessageId === message.id}
                                      className={`p-1 rounded-full transition-colors ${
                                        message.speaker === 'doctor'
                                          ? 'bg-blue-500 hover:bg-blue-400 text-white'
                                          : 'bg-green-200 hover:bg-green-300 text-green-800'
                                      }`}
                                    >
                                      {playingMessageId === message.id ? (
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </button>
                                  )}
                                </div>
                                <p className="text-lg font-medium">
                                  {message.translatedText}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4">
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {/* Microphone Permission Info Banner */}
                {currentSpeaker === 'patient' && speechSupported && !isListening && (
                  <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex">
                      <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">Voice input available!</p>
                        <p>Click the microphone button to speak in Chinese. If prompted, please allow microphone access for the best experience.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className={`border-2 rounded-lg ${
                      currentSpeaker === 'doctor' ? 'border-blue-300' : 'border-green-300'
                    }`}>
                      <div className="flex items-start">
                        <textarea
                          value={inputText}
                          onChange={handleInputChange}
                          placeholder={
                            currentSpeaker === 'doctor' 
                              ? "Type doctor's message in English..." 
                              : "Type patient's response in Chinese..."
                          }
                          className="flex-1 px-3 py-2 border-0 rounded-lg focus:ring-0 focus:outline-none resize-none"
                          disabled={isTranslating || isListening}
                          maxLength={2000}
                          rows={2}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (inputText.trim() && !isTranslating) {
                                handleTranslate();
                              }
                            }
                          }}
                        />
                        
                        {/* Voice Input Button - Only show for patient */}
                        {currentSpeaker === 'patient' && speechSupported && (
                          <button
                            onClick={isListening ? stopListening : startListening}
                            disabled={isTranslating}
                            className={`m-2 p-2 rounded-full transition-all duration-200 ${
                              isListening 
                                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={isListening ? "Stop voice input" : "Start voice input"}
                          >
                            {isListening ? (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a2 2 0 114 0v6a2 2 0 11-4 0V7z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                      
                      <div className="px-3 pb-2 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            Speaking as: {currentSpeaker === 'doctor' ? '👨‍⚕️ Doctor' : '🏥 Patient'}
                          </span>
                          {currentSpeaker === 'patient' && speechSupported && (
                            <span className="text-xs text-blue-500">
                              🎤 Voice input available
                            </span>
                          )}
                          {isListening && (
                            <span className="text-xs text-red-500 animate-pulse">
                              🔴 Listening...
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{inputText.length}/2000</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleTranslate}
                    disabled={!inputText.trim() || isTranslating || validateInput(inputText)}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      currentSpeaker === 'doctor'
                        ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white'
                        : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white'
                    } disabled:cursor-not-allowed flex items-center`}
                  >
                    {isTranslating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Interpreting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        Interpret
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;