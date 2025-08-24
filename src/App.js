import React, { useState, useRef, useCallback } from 'react';
import { Upload, BookOpen, Brain, Zap, ChevronLeft, ChevronRight, RotateCcw, Trophy, FileText, Sparkles } from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedText, setUploadedText] = useState('');
  const [flashcards, setFlashcards] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flippedCards, setFlippedCards] = useState(new Set());
  const fileInputRef = useRef(null);

  // Process PDF file
  const processPDF = useCallback(async (file) => {
    try {
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) {
        alert('PDF processing library not loaded. Please refresh and try again.');
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      setUploadedText(fullText);
    } catch (error) {
      alert('Error processing PDF. Please try again or enter text manually.');
      console.error('PDF processing error:', error);
    }
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      processPDF(file);
    }
  }, [processPDF]);

  // Generate flashcards from text
  const generateFlashcards = useCallback((text) => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const cards = [];

    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 30 && cards.length < 15) {
        // Pattern matching for definitions
        if (trimmed.includes(' is ') || trimmed.includes(' are ') || trimmed.includes(' means ')) {
          const parts = trimmed.split(/ is | are | means /);
          if (parts.length >= 2) {
            cards.push({
              id: cards.length,
              question: `What ${parts[0].toLowerCase().trim()}?`,
              answer: parts.slice(1).join(' is ').trim()
            });
          }
        }
        // Key concept extraction
        else if (trimmed.length > 50) {
          const words = trimmed.split(' ');
          const keyWord = words.find(w => w.length > 6 && w[0] === w[0].toUpperCase());
          if (keyWord) {
            cards.push({
              id: cards.length,
              question: `Explain: ${keyWord}`,
              answer: trimmed
            });
          }
        }
      }
    });

    // Fallback if no patterns found
    if (cards.length === 0) {
      const chunks = text.split('\n').filter(chunk => chunk.trim().length > 30);
      chunks.slice(0, 10).forEach((chunk, i) => {
        cards.push({
          id: i,
          question: `Key Concept ${i + 1}`,
          answer: chunk.trim()
        });
      });
    }

    return cards;
  }, []);

  // Generate quiz questions
  const generateQuiz = useCallback((text) => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const questions = [];

    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 40 && questions.length < 10) {
        const words = trimmed.split(' ');
        const importantWords = words.filter(w => 
          w.length > 5 && (w[0] === w[0].toUpperCase() || w.length > 8)
        );

        if (importantWords.length > 0) {
          const keyWord = importantWords[0];
          const questionText = trimmed.replace(keyWord, '_____');
          
          const options = [keyWord];
          const otherWords = importantWords.slice(1, 4);
          otherWords.forEach(word => options.push(word));
          
          const genericOptions = ['Process', 'System', 'Method', 'Theory', 'Principle', 'Concept'];
          while (options.length < 4) {
            const randomOption = genericOptions[Math.floor(Math.random() * genericOptions.length)];
            if (!options.includes(randomOption)) {
              options.push(randomOption);
            }
          }

          const shuffledOptions = options.sort(() => Math.random() - 0.5);
          
          questions.push({
            id: questions.length,
            question: questionText,
            options: shuffledOptions,
            correctAnswer: shuffledOptions.indexOf(keyWord),
            explanation: `The correct answer is "${keyWord}" based on the content.`
          });
        }
      }
    });

    return questions;
  }, []);

  // Generate study materials
  const generateStudyMaterials = useCallback(async () => {
    if (!uploadedText.trim()) {
      alert('Please upload a PDF or enter some text first!');
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate AI processing

    const cards = generateFlashcards(uploadedText);
    const quiz = generateQuiz(uploadedText);

    setFlashcards(cards);
    setQuizQuestions(quiz);
    setQuizAnswers(new Array(quiz.length).fill(null));
    setCurrentQuizIndex(0);
    setShowResults(false);
    setIsLoading(false);
    setActiveTab('flashcards');
  }, [uploadedText, generateFlashcards, generateQuiz]);

  // Toggle flashcard flip
  const toggleCardFlip = useCallback((cardId) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);

  // Handle quiz answer selection
  const selectQuizAnswer = useCallback((answerIndex) => {
    setQuizAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuizIndex] = answerIndex;
      return newAnswers;
    });
  }, [currentQuizIndex]);

  // Navigate quiz
  const nextQuestion = useCallback(() => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  }, [currentQuizIndex, quizQuestions.length]);

  const previousQuestion = useCallback(() => {
    if (currentQuizIndex > 0) {
      setCurrentQuizIndex(prev => prev - 1);
    }
  }, [currentQuizIndex]);

  const restartQuiz = useCallback(() => {
    setCurrentQuizIndex(0);
    setQuizAnswers(new Array(quizQuestions.length).fill(null));
    setShowResults(false);
  }, [quizQuestions.length]);

  // Calculate quiz score
  const calculateScore = useCallback(() => {
    let correct = 0;
    quizAnswers.forEach((answer, index) => {
      if (answer === quizQuestions[index]?.correctAnswer) {
        correct++;
      }
    });
    return { correct, total: quizQuestions.length, percentage: Math.round((correct / quizQuestions.length) * 100) };
  }, [quizAnswers, quizQuestions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-pink-400 to-red-500 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-green-400 to-blue-500 rounded-full opacity-10 animate-spin" style={{animationDuration: '20s'}}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
              GenAI Flashcards
            </h1>
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>
          <p className="text-xl text-gray-300 font-light">Transform your knowledge into interactive learning experiences</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-2 border border-white/10">
            <div className="flex space-x-2">
              {[
                { id: 'upload', icon: Upload, label: 'Upload & Generate' },
                { id: 'flashcards', icon: BookOpen, label: 'Flashcards' },
                { id: 'quiz', icon: Brain, label: 'Quiz' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="bg-black/20 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl">
              <div className="text-center mb-8">
                <FileText className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                <h2 className="text-3xl font-bold text-white mb-2">Upload Your Content</h2>
                <p className="text-gray-300">Upload a PDF or paste your notes to get started</p>
              </div>

              {/* File Upload Area */}
              <div 
                className="border-3 border-dashed border-blue-400/50 rounded-2xl p-12 mb-6 text-center transition-all duration-300 hover:border-blue-400 hover:bg-blue-400/5 cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold text-white mb-2">Drop your PDF here</h3>
                <p className="text-gray-400">or click to browse files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Text Input */}
              <div className="mb-6">
                <label className="block text-lg font-medium text-white mb-3">Or paste your notes:</label>
                <textarea
                  value={uploadedText}
                  onChange={(e) => setUploadedText(e.target.value)}
                  placeholder="Paste your lecture notes here... 

Example:
Photosynthesis is the process by which plants convert sunlight into energy. It occurs in chloroplasts and involves two main stages: light-dependent reactions and the Calvin cycle..."
                  className="w-full h-40 p-4 bg-black/30 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all resize-none"
                />
              </div>

              {/* Generate Button */}
              <div className="text-center">
                <button
                  onClick={generateStudyMaterials}
                  disabled={isLoading || !uploadedText.trim()}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-2xl transition-all duration-300 hover:from-blue-600 hover:to-purple-700 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-6 h-6" />
                      Generate Study Materials
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Flashcards Tab */}
          {activeTab === 'flashcards' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <h2 className="text-3xl font-bold text-white mb-2">Interactive Flashcards</h2>
                <p className="text-gray-300">Click on cards to reveal answers • {flashcards.length} cards generated</p>
              </div>

              {flashcards.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {flashcards.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => toggleCardFlip(card.id)}
                      className="relative h-64 cursor-pointer group perspective"
                    >
                      <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
                        flippedCards.has(card.id) ? 'rotate-y-180' : ''
                      }`}>
                        {/* Front */}
                        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 flex items-center justify-center shadow-xl border border-white/10">
                          <div className="text-center">
                            <div className="text-sm text-blue-100 mb-2">Question {card.id + 1}</div>
                            <h3 className="text-white font-semibold text-lg mb-4">{card.question}</h3>
                            <div className="text-blue-100 text-sm opacity-75">Click to reveal answer</div>
                          </div>
                        </div>
                        
                        {/* Back */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl p-6 flex items-center justify-center shadow-xl border border-white/10">
                          <div className="text-center">
                            <div className="text-sm text-green-100 mb-2">Answer</div>
                            <p className="text-white font-medium leading-relaxed">{card.answer}</p>
                            <div className="text-green-100 text-sm opacity-75 mt-4">Click to see question</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <BookOpen className="w-24 h-24 mx-auto mb-6 text-gray-500" />
                  <h3 className="text-2xl font-semibold text-gray-400 mb-2">No flashcards yet</h3>
                  <p className="text-gray-500">Upload content first to generate flashcards</p>
                </div>
              )}
            </div>
          )}

          {/* Quiz Tab */}
          {activeTab === 'quiz' && (
            <div className="max-w-4xl mx-auto">
              {quizQuestions.length > 0 ? (
                <>
                  {!showResults ? (
                    <div className="bg-black/20 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl">
                      {/* Progress Bar */}
                      <div className="mb-8">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white font-medium">Question {currentQuizIndex + 1} of {quizQuestions.length}</span>
                          <span className="text-blue-400">{Math.round(((currentQuizIndex + 1) / quizQuestions.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Question */}
                      <div className="mb-8">
                        <h3 className="text-2xl font-bold text-white mb-6 leading-relaxed">
                          {quizQuestions[currentQuizIndex]?.question}
                        </h3>

                        {/* Options */}
                        <div className="space-y-3">
                          {quizQuestions[currentQuizIndex]?.options.map((option, index) => (
                            <button
                              key={index}
                              onClick={() => selectQuizAnswer(index)}
                              className={`w-full p-4 text-left rounded-xl transition-all duration-300 border-2 ${
                                quizAnswers[currentQuizIndex] === index
                                  ? 'border-blue-500 bg-blue-500/20 text-white'
                                  : 'border-gray-600 bg-black/20 text-gray-300 hover:border-gray-500 hover:bg-gray-800/30'
                              }`}
                            >
                              <span className="font-medium mr-3 text-blue-400">
                                {String.fromCharCode(65 + index)}.
                              </span>
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Navigation */}
                      <div className="flex justify-between items-center">
                        <button
                          onClick={previousQuestion}
                          disabled={currentQuizIndex === 0}
                          className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-xl transition-all hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-5 h-5" />
                          Previous
                        </button>

                        <div className="text-gray-400">
                          {quizAnswers.filter(a => a !== null).length} / {quizQuestions.length} answered
                        </div>

                        <button
                          onClick={nextQuestion}
                          disabled={quizAnswers[currentQuizIndex] === null}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl transition-all hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {currentQuizIndex === quizQuestions.length - 1 ? 'Finish' : 'Next'}
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Results */
                    <div className="bg-black/20 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl text-center">
                      <Trophy className="w-20 h-20 mx-auto mb-6 text-yellow-400" />
                      <h2 className="text-4xl font-bold text-white mb-4">Quiz Complete!</h2>
                      
                      <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-2xl p-6 mb-8">
                        <div className="text-6xl font-bold text-white mb-2">
                          {calculateScore().correct}/{calculateScore().total}
                        </div>
                        <div className="text-2xl text-blue-400 mb-2">
                          {calculateScore().percentage}% Score
                        </div>
                        <div className="text-gray-400">
                          {calculateScore().percentage >= 80 ? 'Excellent work!' : 
                           calculateScore().percentage >= 60 ? 'Good job!' : 'Keep studying!'}
                        </div>
                      </div>

                      <button
                        onClick={restartQuiz}
                        className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl transition-all hover:from-green-600 hover:to-blue-700"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Take Quiz Again
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <Brain className="w-24 h-24 mx-auto mb-6 text-gray-500" />
                  <h3 className="text-2xl font-semibold text-gray-400 mb-2">No quiz available</h3>
                  <p className="text-gray-500">Generate study materials first to take a quiz</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;