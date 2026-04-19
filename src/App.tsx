/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw, 
  Check, 
  ChevronRight,
  GraduationCap,
  Sparkles,
  RefreshCw,
  FileText,
  FileCheck
} from "lucide-react";
import { analyzeWriting, generateExercises } from "./services/deepseekService.ts";
import { cn } from "./lib/utils.ts";
import Markdown from "react-markdown";

type AppState = "intro" | "upload" | "loading" | "results";
type Grade = "Grade 1-3" | "Grade 4-6" | "Middle School" | "High School" | "University/IELTS";

interface ProblematicSentence {
  sentence: string;
  type: string;
  description: string;
  fix: string;
}

interface AnalysisResult {
  summary: string;
  score: string;
  problematicSentences: ProblematicSentence[];
  keyTakeaways: string[];
}

interface Exercise {
  title: string;
  type: "multiple-choice" | "fill-blank" | "ordering";
  instruction: string;
  questions: Array<{
    question: string;
    options?: string[];
    answer: string;
    explanation: string;
  }>;
}

export default function App() {
  const [state, setState] = useState<AppState>("intro");
  const [grade, setGrade] = useState<Grade>("High School");
  const [writingFile, setWritingFile] = useState<File | null>(null);
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isGeneratingExercises, setIsGeneratingExercises] = useState(false);
  const [showExercises, setShowExercises] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<{[key: string]: string}>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<{[key: string]: boolean}>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rubricInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async () => {
    if (!writingFile) return;

    setState("loading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("writing", writingFile);
      if (rubricFile) {
        formData.append("rubric", rubricFile);
      }

      const res = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to process files");
      const { writingText, rubricText } = await res.json();

      if (!writingText) throw new Error("Could not find any text in your document.");

      const analysis = await analyzeWriting(writingText, grade, rubricText);
      setResult(analysis);
      setState("results");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setState("upload");
    }
  };

  const handleGenerateExercises = async () => {
    if (!result) return;
    setIsGeneratingExercises(true);
    try {
      const { exercises: generated } = await generateExercises(result.problematicSentences, grade);
      setExercises(generated);
      setShowExercises(true);
    } catch (err) {
      console.error(err);
      setError("Failed to generate exercises.");
    } finally {
      setIsGeneratingExercises(false);
    }
  };

  const reset = () => {
    setState("intro");
    setWritingFile(null);
    setRubricFile(null);
    setResult(null);
    setExercises([]);
    setShowExercises(false);
    setError(null);
    setUserAnswers({});
    setSubmittedAnswers({});
  };

  const handleAnswerSelect = (questionKey: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionKey]: answer
    }));
  };

  const handleSubmitAnswer = (questionKey: string, correctAnswer: string) => {
    const userAnswer = userAnswers[questionKey];
    if (!userAnswer) return;
    
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    setSubmittedAnswers(prev => ({
      ...prev,
      [questionKey]: isCorrect
    }));
  };

  const handleResetExercises = () => {
    setUserAnswers({});
    setSubmittedAnswers({});
  };

  return (
    <div className="min-h-screen flex flex-col items-center">
      <nav className="w-full max-w-7xl px-8 py-6 flex justify-between items-center bg-transparent border-b border-black/5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
          <div className="w-10 h-10 bg-brand-primary flex items-center justify-center rounded-full text-white">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight heading-display">LingoLift</span>
        </div>
        <div className="flex gap-8 text-sm font-medium uppercase tracking-wider opacity-60">
          <span>Tutor</span>
          <span>Resources</span>
          <span>About</span>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl px-8 py-12">
        <AnimatePresence mode="wait">
          {state === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-12">
                <span className="text-sm font-bold uppercase tracking-widest text-brand-primary mb-4 block">Personalized ESL Tutoring</span>
                <h1 className="text-6xl font-bold mb-6 heading-display leading-[1.1]">Elevate your writing style with AI.</h1>
                <p className="text-xl opacity-60 leading-relaxed mb-10">
                  Select your current grade and upload your essay. Our AI tutor will analyze your writing against standard rubrics and provide actionable feedback.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                {(["Grade 1-3", "Grade 4-6", "Middle School", "High School", "University/IELTS"] as Grade[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGrade(g)}
                    className={cn(
                      "p-6 rounded-2xl border transition-all text-left group",
                      grade === g 
                        ? "bg-brand-primary border-brand-primary text-white shadow-xl shadow-brand-primary/20 scale-[1.02]"
                        : "bg-white border-black/10 hover:border-brand-primary/40 hover:bg-black/[0.02]"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">{g}</span>
                      {grade === g ? <CheckCircle className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 opacity-20 group-hover:opacity-100 transition-opacity" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => setState("upload")}
                  className="px-12 py-5 bg-black text-white rounded-full font-bold text-lg hover:bg-black/90 transition-all flex items-center gap-3 active:scale-95"
                >
                  Get Started <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {state === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-3xl mx-auto"
            >
              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mb-10 flex items-center gap-4">
                <button onClick={() => setState("intro")} className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <h2 className="text-3xl font-bold heading-display">Upload Your Materials</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Writing Upload */}
                <div 
                  className={cn(
                    "relative aspect-[4/5] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center transition-all cursor-pointer",
                    writingFile ? "bg-brand-primary/5 border-brand-primary" : "bg-white border-black/10 hover:border-black/20"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={(e) => setWritingFile(e.target.files?.[0] || null)}
                    accept=".pdf,.docx,.txt"
                  />
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", writingFile ? "bg-brand-primary text-white" : "bg-black/5 text-black/40")}>
                    {writingFile ? <FileCheck className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                  </div>
                  <h3 className="text-xl font-bold mb-2">Student Writing</h3>
                  <p className="text-sm opacity-50 mb-6">PDF, Word, or Text files. This is what we will analyze.</p>
                  {writingFile ? (
                    <div className="bg-brand-primary text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
                      {writingFile.name}
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-brand-primary">Click to select file</span>
                  )}
                </div>

                {/* Rubric Upload */}
                <div 
                  className={cn(
                    "relative aspect-[4/5] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center transition-all cursor-pointer",
                    rubricFile ? "bg-brand-secondary/5 border-brand-secondary" : "bg-white border-black/5 hover:border-black/10"
                  )}
                  onClick={() => rubricInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={rubricInputRef} 
                    onChange={(e) => setRubricFile(e.target.files?.[0] || null)}
                    accept=".pdf,.docx,.txt"
                  />
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", rubricFile ? "bg-brand-secondary text-white" : "bg-black/5 text-black/20")}>
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Teacher's Rubric</h3>
                  <p className="text-sm opacity-40 mb-6">Optional. If provided, we'll grade based on these specific rules.</p>
                  {rubricFile ? (
                    <div className="bg-brand-secondary text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
                      {rubricFile.name}
                    </div>
                  ) : (
                    <span className="text-sm font-semibold opacity-40">Optional Upload</span>
                  )}
                </div>
              </div>

              <div className="mt-12 flex justify-center">
                <button
                  onClick={handleFileUpload}
                  disabled={!writingFile}
                  className={cn(
                    "px-16 py-5 rounded-full font-bold text-lg transition-all flex items-center gap-3 active:scale-95 shadow-lg",
                    writingFile ? "bg-brand-primary text-white shadow-brand-primary/30" : "bg-black/10 text-black/40 cursor-not-allowed shadow-none"
                  )}
                >
                  Analyze My Writing <Check className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative w-32 h-32 mb-12">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-brand-primary/20 border-t-brand-primary rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap className="w-12 h-12 text-brand-primary" />
                </div>
              </div>
              <h2 className="text-4xl font-bold heading-display mb-4">Reading your essay...</h2>
              <p className="text-xl opacity-60 max-w-md text-center">
                Our AI tutor is analyzing your grammar, vocabulary, and structure based on {grade} expectations.
              </p>
            </motion.div>
          )}

          {state === "results" && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-12 pb-24"
            >
              <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-4 py-1.5 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-bold uppercase tracking-widest">{grade}</span>
                    <span className="opacity-40 text-sm">Analysis Complete</span>
                  </div>
                  <h2 className="text-5xl font-bold heading-display mb-6 tracking-tight">Tutor's Evaluation</h2>
                  <p className="text-xl opacity-70 leading-relaxed mb-8">{result.summary}</p>
                  
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-black/5 flex-1 min-w-[200px]">
                      <span className="text-sm font-bold opacity-40 uppercase tracking-wider mb-2 block">Grade Score</span>
                      <div className="text-4xl font-bold text-brand-primary">{result.score}</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-black/5 flex-1 min-w-[200px]">
                      <span className="text-sm font-bold opacity-40 uppercase tracking-wider mb-2 block">Issues Found</span>
                      <div className="text-4xl font-bold">{result.problematicSentences.length}</div>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-80 bg-black text-white p-8 rounded-[2.5rem] shadow-2xl">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-primary" /> Key Takeaways
                  </h3>
                  <ul className="space-y-4">
                    {result.keyTakeaways.map((task, i) => (
                      <li key={i} className="flex gap-3 text-sm opacity-80 leading-relaxed">
                        <div className="w-5 h-5 rounded-full bg-brand-primary/20 flex-shrink-0 flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </div>
                        {task}
                      </li>
                    ))}
                  </ul>
                  <button 
                    onClick={handleGenerateExercises}
                    disabled={isGeneratingExercises}
                    className="w-full mt-10 py-4 bg-white text-black rounded-full font-bold text-sm tracking-wide hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                  >
                    {isGeneratingExercises ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Generate Exercises
                  </button>
                </div>
              </div>

              {/* Problematic Sentences Section */}
              <div>
                <h3 className="text-3xl font-bold heading-display mb-8">Sentences to Improve</h3>
                <div className="bg-white rounded-[2.5rem] border border-black/10 p-10 mb-8">
                  <div className="space-y-4 text-lg leading-relaxed">
                    {result.problematicSentences.map((problem, i) => {
                      const sentenceIndex = problem.sentence;
                      return (
                        <div key={i} className="p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border-l-4 border-red-400 hover:shadow-lg transition-all">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-base font-medium text-gray-800 mb-2 italic">"{problem.sentence}"</p>
                              <div className="flex flex-wrap gap-2 mb-2">
                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase">
                                  {problem.type}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">
                                <span className="font-semibold">Issue:</span> {problem.description}
                              </p>
                              <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                                <span className="font-semibold">✓ Better:</span> {problem.fix}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Exercises Modal-ish View */}
              <AnimatePresence>
                {showExercises && exercises.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-12 pt-12 border-t border-black/5"
                  >
                    <div className="text-center mb-12">
                      <h2 className="text-4xl font-bold heading-display mb-4">Practice Makes Perfect</h2>
                      <p className="opacity-60 text-lg">Hone your skills with these exercises specifically designed for you.</p>
                    </div>

                    <div className="space-y-8">
                      {exercises.map((ex, i) => (
                        <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-black/5 shadow-lg hover:shadow-xl transition-all">
                          <div className="mb-8">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-xs font-bold uppercase text-brand-primary tracking-widest">Exercise {i+1}</span>
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold uppercase",
                                ex.type === "multiple-choice" && "bg-blue-100 text-blue-700",
                                ex.type === "fill-blank" && "bg-purple-100 text-purple-700",
                                ex.type === "ordering" && "bg-orange-100 text-orange-700"
                              )}>
                                {ex.type === "multiple-choice" && "Multiple Choice"}
                                {ex.type === "fill-blank" && "Fill in the Blank"}
                                {ex.type === "ordering" && "Sentence Ordering"}
                              </span>
                            </div>
                            <h3 className="text-3xl font-bold heading-display mb-4">{ex.title}</h3>
                            <p className="text-lg opacity-60">{ex.instruction}</p>
                          </div>
                          
                          <div className="space-y-8">
                            {ex.questions.map((q, j) => {
                              const questionKey = `${i}-${j}`;
                              const userAnswer = userAnswers[questionKey];
                              const isSubmitted = submittedAnswers[questionKey] !== undefined;
                              const isCorrect = submittedAnswers[questionKey];

                              return (
                                <div key={j} className="p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 hover:border-brand-primary/30 transition-all">
                                  <p className="text-lg font-medium mb-6 text-gray-800">
                                    <span className="text-brand-primary font-bold mr-2">Q{j+1}:</span> 
                                    {q.question}
                                  </p>
                                  
                                  {/* Multiple Choice Options */}
                                  {ex.type === "multiple-choice" && q.options && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                      {q.options.map((option, k) => {
                                        const optionLetter = option.charAt(0).toUpperCase();
                                        const isSelected = userAnswer === optionLetter;
                                        const showCorrect = isSubmitted && optionLetter === q.answer.charAt(0).toUpperCase();
                                        const showIncorrect = isSubmitted && isSelected && !isCorrect;
                                        
                                        return (
                                          <button
                                            key={k}
                                            onClick={() => !isSubmitted && handleAnswerSelect(questionKey, optionLetter)}
                                            disabled={isSubmitted}
                                            className={cn(
                                              "p-4 rounded-xl border-2 transition-all font-medium text-left",
                                              !isSubmitted && "cursor-pointer hover:border-brand-primary hover:bg-brand-primary/5",
                                              isSubmitted && "cursor-default",
                                              showCorrect && "bg-green-100 border-green-500 text-green-900",
                                              showIncorrect && "bg-red-100 border-red-500 text-red-900",
                                              !isSubmitted && isSelected && "bg-brand-primary/10 border-brand-primary",
                                              !isSubmitted && !isSelected && "bg-white border-gray-200"
                                            )}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span>{option}</span>
                                              {showCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
                                              {showIncorrect && <AlertCircle className="w-5 h-5 text-red-600" />}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* Fill in the Blank Input */}
                                  {ex.type === "fill-blank" && (
                                    <div className="mb-6">
                                      <input
                                        type="text"
                                        value={userAnswer || ""}
                                        onChange={(e) => handleAnswerSelect(questionKey, e.target.value)}
                                        disabled={isSubmitted}
                                        placeholder="Type your answer here..."
                                        className={cn(
                                          "w-full p-4 rounded-xl border-2 transition-all text-lg",
                                          !isSubmitted && "border-gray-300 focus:border-brand-primary focus:outline-none",
                                          isSubmitted && isCorrect && "bg-green-50 border-green-500",
                                          isSubmitted && !isCorrect && "bg-red-50 border-red-500"
                                        )}
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Ordering Exercise - Draggable Items */}
                                  {ex.type === "ordering" && q.options && (
                                    <div className="mb-6 space-y-2">
                                      <p className="text-sm font-semibold text-gray-600 mb-3">Click to select the correct order:</p>
                                      <div className="grid grid-cols-1 gap-2">
                                        {q.options.map((item, k) => {
                                          const position = userAnswer ? userAnswer.split(',').indexOf(String(k + 1)) : -1;
                                          const isSelected = userAnswer && userAnswer.split(',').includes(String(k + 1));
                                          
                                          return (
                                            <button
                                              key={k}
                                              onClick={() => {
                                                if (!isSubmitted) {
                                                  const currentOrder = userAnswer ? userAnswer.split(',').filter(x => x) : [];
                                                  if (currentOrder.includes(String(k + 1))) {
                                                    // Remove from order
                                                    const newOrder = currentOrder.filter(x => x !== String(k + 1));
                                                    handleAnswerSelect(questionKey, newOrder.join(','));
                                                  } else {
                                                    // Add to order
                                                    const newOrder = [...currentOrder, String(k + 1)];
                                                    handleAnswerSelect(questionKey, newOrder.join(','));
                                                  }
                                                }
                                              }}
                                              disabled={isSubmitted}
                                              className={cn(
                                                "p-4 rounded-xl border-2 transition-all text-left",
                                                !isSubmitted && "cursor-pointer hover:border-brand-primary",
                                                isSelected && "bg-brand-primary/10 border-brand-primary",
                                                !isSelected && "bg-white border-gray-200"
                                              )}
                                            >
                                              <div className="flex items-center gap-3">
                                                {isSelected && position >= 0 && (
                                                  <div className="w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                                                    {position + 1}
                                                  </div>
                                                )}
                                                <span className="flex-1">{item}</span>
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                      {userAnswer && (
                                        <p className="text-sm text-gray-600 mt-3">
                                          Your order: {userAnswer.split(',').filter(x => x).map(n => `#${n}`).join(' → ')}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Submit Button */}
                                  {!isSubmitted && userAnswer && (
                                    <button
                                      onClick={() => handleSubmitAnswer(questionKey, q.answer)}
                                      className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold text-lg hover:bg-brand-primary/90 transition-all mb-4"
                                    >
                                      Submit Answer
                                    </button>
                                  )}
                                  
                                  {/* Result Feedback */}
                                  {isSubmitted && (
                                    <div className="mb-4 space-y-3">
                                      <div className={cn(
                                        "p-4 rounded-xl font-bold text-lg flex items-center gap-3",
                                        isCorrect ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"
                                      )}>
                                        {isCorrect ? (
                                          <>
                                            <CheckCircle className="w-6 h-6" />
                                            <span>Correct! Well done!</span>
                                          </>
                                        ) : (
                                          <>
                                            <AlertCircle className="w-6 h-6" />
                                            <span>Incorrect. The correct answer is: {q.answer}</span>
                                          </>
                                        )}
                                      </div>
                                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900">
                                        <span className="font-semibold">Explanation:</span> {q.explanation}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Reset Exercises Button */}
                    <div className="flex justify-center mt-8">
                      <button
                        onClick={handleResetExercises}
                        className="px-8 py-4 bg-gray-100 text-gray-700 rounded-full font-bold hover:bg-gray-200 transition-all flex items-center gap-2"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Reset All Exercises
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-center pt-12">
                <button onClick={reset} className="px-10 py-4 border border-black/10 rounded-full font-bold flex items-center gap-2 hover:bg-black/5 transition-all">
                  <RotateCcw className="w-4 h-4" /> Start Over
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full py-12 px-8 border-t border-black/5 bg-white/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-50">
            <GraduationCap className="w-5 h-5" />
            <span className="font-bold heading-display">LingoLift</span>
          </div>
          <div className="flex gap-12 text-xs font-bold uppercase tracking-widest opacity-30">
            <span>© 2026 LingoLift AI</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
