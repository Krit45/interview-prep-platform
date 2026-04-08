import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Interview, InterviewType, Difficulty, Question, Response } from '../types';
import { generateQuestions, analyzeResponse, generateFinalFeedback } from '../services/geminiService';
import { Mic, MicOff, Send, Loader2, CheckCircle, ChevronRight, AlertCircle, Play, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InterviewPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<'setup' | 'interview' | 'feedback'>('setup');
  
  // Setup State
  const [role, setRole] = useState('');
  const [type, setType] = useState<InterviewType>('Technical');
  const [difficulty, setDifficulty] = useState<Difficulty>('Intermediate');
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const categories = [
    'Behavioral',
    'Technical Skills',
    'Problem Solving',
    'System Design',
    'Cultural Fit',
    'Leadership',
    'Project Experience'
  ];

  const templates = [
    { role: 'Software Engineer', type: 'Technical', difficulty: 'Intermediate', categories: ['Technical Skills', 'Problem Solving'] },
    { role: 'Product Manager', type: 'HR', difficulty: 'Intermediate', categories: ['Behavioral', 'Leadership'] },
    { role: 'Data Scientist', type: 'Technical', difficulty: 'Intermediate', categories: ['Technical Skills', 'Problem Solving'] },
    { role: 'Frontend Developer', type: 'Technical', difficulty: 'Intermediate', categories: ['Technical Skills', 'Project Experience'] },
    { role: 'HR Manager', type: 'HR', difficulty: 'Intermediate', categories: ['Behavioral', 'Cultural Fit'] },
  ];

  const applyTemplate = (template: any) => {
    setRole(template.role);
    setType(template.type as InterviewType);
    setDifficulty(template.difficulty as Difficulty);
    setSelectedCategories(template.categories);
  };

  // Interview State
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [responses, setResponses] = useState<Response[]>([]);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes per question
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Feedback State
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalFeedback, setFinalFeedback] = useState<string | null>(null);

  // Speech Recognition
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setAnswer((prev) => prev + event.results[i][0].transcript + ' ');
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (step === 'interview' && timeLeft > 0 && !isPracticeMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isPracticeMode) {
      handleSubmitAnswer();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, timeLeft, currentQuestionIndex]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  const startInterview = async () => {
    if (!role || !user) return;
    setLoading(true);
    try {
      // 1. Create Interview Doc
      const interviewData = {
        userId: user.uid,
        role,
        type,
        difficulty,
        isPracticeMode,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'interviews'), {
        ...interviewData,
        createdAt: serverTimestamp(),
      });
      setInterviewId(docRef.id);

      // 2. Generate Questions
      const generatedQuestions = await generateQuestions(
        role, 
        type, 
        difficulty, 
        profile?.resumeText,
        isPracticeMode ? selectedCategories : undefined,
        profile?.skills,
        profile?.experienceKeywords
      );
      setQuestions(generatedQuestions);
      
      setStep('interview');
      setTimeLeft(120);
    } catch (error) {
      console.error('Error starting interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!interviewId || !questions[currentQuestionIndex] || loading) return;
    
    setLoading(true);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    try {
      const question = questions[currentQuestionIndex];
      const analysis = await analyzeResponse(question.text, answer, role, type);
      
      const responseData = {
        interviewId,
        question: question.text,
        answer,
        score: analysis.score,
        feedback: analysis.feedback,
        createdAt: new Date().toISOString(),
      };
      
      await addDoc(collection(db, `interviews/${interviewId}/responses`), {
        ...responseData,
        createdAt: serverTimestamp(),
      });

      setResponses((prev) => [...prev, { id: '', ...responseData }]);
      setAnswer('');
      
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setTimeLeft(120);
      } else {
        await finishInterview();
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setLoading(false);
    }
  };

  const finishInterview = async () => {
    if (!interviewId) return;
    setLoading(true);
    try {
      // Fetch all responses for final feedback
      const q = query(collection(db, `interviews/${interviewId}/responses`), orderBy('createdAt', 'asc'));
      const querySnapshot = await getDocs(q);
      const allResponses = querySnapshot.docs.map(doc => doc.data());
      
      const feedback = await generateFinalFeedback(allResponses, role, type);
      
      await updateDoc(doc(db, 'interviews', interviewId), {
        status: 'completed',
        score: feedback.score,
        feedback: feedback.feedback,
      });

      setFinalScore(feedback.score);
      setFinalFeedback(feedback.feedback);
      setStep('feedback');
    } catch (error) {
      console.error('Error finishing interview:', error);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'setup') {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">Configure Your Interview</h2>
          <p className="text-slate-500">Tailor the experience to your target role and skill level.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700">Quick Templates</label>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.role}
                  onClick={() => applyTemplate(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    role === t.role
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'
                  }`}
                >
                  {t.role}
                </button>
              ))}
              <button
                onClick={() => {
                  setRole('');
                  setType('Technical');
                  setDifficulty('Intermediate');
                  setSelectedCategories([]);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all border bg-white border-slate-200 text-slate-600 hover:border-indigo-200"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Target Role</label>
            <input
              type="text"
              placeholder="e.g. Senior Frontend Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-bold text-slate-700">Interview Mode</label>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setIsPracticeMode(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    !isPracticeMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Formal Interview
                </button>
                <button
                  onClick={() => setIsPracticeMode(true)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    isPracticeMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Practice Mode
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Interview Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as InterviewType)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="Technical">Technical</option>
                <option value="HR">HR / Behavioral</option>
                <option value="Coding">Coding Logic</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          {isPracticeMode && (
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700">Focus Categories (Optional)</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategories(prev => 
                        prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                      );
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      selectedCategories.includes(cat)
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={startInterview}
            disabled={!role || loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
            {isPracticeMode ? 'Start Practice Session' : 'Start Mock Interview'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'interview') {
    const currentQuestion = questions[currentQuestionIndex];
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold shrink-0">
              {currentQuestionIndex + 1}/{questions.length}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{role}</p>
              <p className="text-xs text-slate-500">{isPracticeMode ? 'Practice Session' : 'Formal Interview'} • {type} • {difficulty}</p>
            </div>
          </div>
          {!isPracticeMode && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold w-full sm:w-auto justify-center ${timeLeft < 30 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
              <Timer size={18} />
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          )}
        </div>

        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8"
        >
          <div className="space-y-4">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider">
              {currentQuestion?.category || 'Question'}
            </span>
            <h3 className="text-2xl font-bold text-slate-900 leading-tight">
              {currentQuestion?.text}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here or use voice input..."
                className="w-full h-48 px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-slate-700 leading-relaxed"
              />
              <button
                onClick={toggleListening}
                className={`absolute bottom-4 right-4 p-3 rounded-full transition-all ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleSubmitAnswer}
                disabled={!answer.trim() || loading}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                {currentQuestionIndex === questions.length - 1 
                  ? (isPracticeMode ? 'Finish Practice' : 'Finish Interview') 
                  : 'Next Question'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-indigo-600 h-full transition-all duration-500"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  if (step === 'feedback') {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full mb-4">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900">
            {isPracticeMode ? 'Practice Session Completed!' : 'Interview Completed!'}
          </h2>
          <p className="text-slate-500">
            {isPracticeMode 
              ? 'Great practice! Here is your performance analysis.' 
              : 'Great job! Here is your performance analysis.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
            <p className="text-sm font-medium text-slate-500 mb-1">Overall Score</p>
            <p className="text-4xl font-bold text-indigo-600">{finalScore}%</p>
          </div>
          <div className="sm:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-2">Key Feedback</h4>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{finalFeedback}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900">Question Breakdown</h3>
          <div className="space-y-4">
            {responses.map((resp, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Question {idx + 1}</p>
                    <p className="font-bold text-slate-900">{resp.question}</p>
                  </div>
                  <div className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg font-bold text-sm">
                    {resp.score}/100
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase">Your Answer</p>
                  <p className="text-slate-600 text-sm italic">"{resp.answer}"</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-900 mb-1">AI Analysis</p>
                  <p className="text-slate-600 text-sm">{resp.feedback}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default InterviewPage;
