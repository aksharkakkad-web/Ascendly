import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { Question } from "@/lib/questionData";
import { getUnitsForClass, getQuestionsForUnit, getAllClassNames, clearCache } from "@/lib/jsonLoader";
import { Latex, MathText } from "@/components/Latex";

// Make LaTeX-like strings readable without a math renderer.
// We keep this conservative to avoid mangling normal words.
const formatText = (text: string) => {
  if (!text) return "";

  // Strip math delimiters
  let formatted = text
    .replace(/\$(.*?)\$/g, "$1")
    .replace(/\\\((.*?)\\\)/g, "$1")
    .replace(/\\\[(.*?)\\\]/g, "$1")
    .replace(/\\n/g, "\n");

  // Simple fraction: \frac{a}{b} -> a/b
  formatted = formatted.replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, "$1/$2");

  // Superscripts/subscripts braces -> plain
  formatted = formatted.replace(/\^\{([^}]*)\}/g, "^$1").replace(/_\{([^}]*)\}/g, "_$1");

  // Targeted token replacements (only when preceded by backslash)
  const tokenMap: Record<string, string> = {
    "delta": "δ", "Delta": "Δ",
    "alpha": "α", "beta": "β", "gamma": "γ", "theta": "θ",
    "mu": "μ", "pi": "π", "sigma": "σ", "rho": "ρ", "omega": "ω",
    "phi": "φ", "psi": "ψ", "lambda": "λ", "eta": "η",
    "cdot": "·", "times": "×",
    "leq": "≤", "le": "≤",
    "geq": "≥", "ge": "≥",
    "pm": "±", "mp": "∓",
    "neq": "≠",
    "to": "→",
    "int": "∫",
    "sum": "Σ",
    "lim": "lim",
  };

  formatted = formatted.replace(/\\([A-Za-z]+)/g, (_, cmd: string) => tokenMap[cmd] ?? cmd);

  // Superscripts/subscripts into basic HTML for readability (e.g., x^2 -> x<sup>2</sup>)
  formatted = formatted.replace(/([A-Za-z0-9])\^([A-Za-z0-9]+)/g, "$1<sup>$2</sup>");
  formatted = formatted.replace(/([A-Za-z0-9])_([A-Za-z0-9]+)/g, "$1<sub>$2</sub>");

  // Compact integrals: ∫_a^b -> ∫[a→b]
  formatted = formatted.replace(/∫\s*_?\s*([^\s^_]+)\s*\^?\s*([^\s^_]+)/g, "∫[$1→$2]");

  // Remove leftover braces and double backslashes
  formatted = formatted.replace(/[{}]/g, "").replace(/\\\\/g, "\\");

  return formatted;
};
import { 
  getLeaderboard,
  updateScore,
  saveQuizResult,
  User,
  getUserQuizHistory,
  deleteUserAccount,
  getClassScore,
  getTotalScore,
  getDisplayName,
  getQuestionAttempts,
  recordQuestionAttempt,
  getQuizProgress,
  saveQuizProgress,
  clearQuizProgress,
  QuizProgress,
  getQuestionCorrectTimestamps,
  getDailyPointsEarned,
  addDailyPoints,
  getUserStreak,
  joinClassByCode,
  getStudentsInSameClass,
  getClassCodeForStudent,
  isClassLeaderboardEnabled,
} from "@/lib/database";
import { 
  calculateQuestionPoints, calculateSessionBonus, formatPointsBreakdown, 
  QuestionScoringResult, SessionScoringResult 
} from "@/lib/scoring";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  GraduationCap, Trophy, Flame, Star, BookOpen, 
  LogOut, Play, CheckCircle, XCircle, ArrowRight,
  Medal, Crown, Plus, Trash2, Settings, UserX, User as UserIcon, Grid3X3, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { computeAdvancedAnalytics } from "@/lib/advancedAnalytics";
import { WeakSkillsPractice } from "./WeakSkillsPractice";

// Sound utility functions
const playCorrectSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play a pleasant ascending tone (C major chord progression)
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    // Silently fail if audio context is not available
  }
};

const playIncorrectSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play a descending tone for incorrect answer
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.type = 'sine';
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    // Silently fail if audio context is not available
  }
};

// Practice Weak Skills Card Component for Practice Tab
function PracticeWeakSkillsCard({ 
  userId, 
  userClasses,
  selectedClass,
  selectedUnit
}: { 
  userId: string; 
  userClasses: string[];
  selectedClass: string;
  selectedUnit: string;
}) {
  const [weakSkillsData, setWeakSkillsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // Use selectedClass if available, otherwise default to first class
  const selectedClassForPractice = selectedClass || userClasses[0] || "";

  useEffect(() => {
    if (!selectedClassForPractice) return;
    setLoading(true);
    computeAdvancedAnalytics(userId, selectedClassForPractice)
      .then((data) => {
        if (data) {
          setWeakSkillsData({
            weakSkills: data.weakSkills,
            practiceQuestions: data.practiceQuestions,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [userId, selectedClassForPractice]);

  if (userClasses.length === 0) return null;

  return (
    <WeakSkillsPractice
      weakSkills={weakSkillsData?.weakSkills || []}
      practiceQuestions={weakSkillsData?.practiceQuestions || []}
      selectedClass={selectedClassForPractice}
      selectedUnit={selectedUnit}
      userId={userId}
    />
  );
}

export function StudentDashboard() {
  const navigate = useNavigate();
  const { user, logout, refreshUser, addClass, removeClass, updateProfile } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [activeQuizClass, setActiveQuizClass] = useState<string>("");
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [leaderboardClass, setLeaderboardClass] = useState<string>("");
  const [classCodeInput, setClassCodeInput] = useState<string>("");
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("practice");
  const [viewingStudent, setViewingStudent] = useState<User | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [questionResults, setQuestionResults] = useState<Record<number, boolean>>({}); // index -> correct/incorrect
  const [sessionPointsEarned, setSessionPointsEarned] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [sessionCorrectAnswers, setSessionCorrectAnswers] = useState(0);
  const [sessionTotalAnswered, setSessionTotalAnswered] = useState(0);
  const [lastScoringResult, setLastScoringResult] = useState<QuestionScoringResult | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [showConfidencePrompt, setShowConfidencePrompt] = useState(false);
  const [pendingConfidence, setPendingConfidence] = useState<number | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState<{
    questionId: string;
    isCorrect: boolean;
    timeTaken: number;
    recentCorrects: string[];
    selectedAnswer: string;
  } | null>(null);
  
  const TIMER_DURATION = 60; // seconds for full bonus

  // Timer effect for question countdown
  useEffect(() => {
    if (!isQuizActive || quizComplete || showResult) return;
    
    const interval = setInterval(() => {
      setElapsedTime((Date.now() - questionStartTime) / 1000);
    }, 100);
    
    return () => clearInterval(interval);
  }, [isQuizActive, quizComplete, showResult, questionStartTime]);
  
  // Settings state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editDisplayPreference, setEditDisplayPreference] = useState<'realName' | 'nickname'>('nickname');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRank, setShowRank] = useState(true);
  const [profileViewShowRank, setProfileViewShowRank] = useState(true);
  const [unitQuestionCounts, setUnitQuestionCounts] = useState<Record<string, number>>({});

  // Initialize settings when user loads
  useEffect(() => {
    if (user) {
      setEditFirstName(user.firstName || "");
      setEditLastName(user.lastName || "");
      setEditNickname(user.nickname || "");
      // Default to nickname if displayPreference is username (migration)
      const pref = user.displayPreference === 'username' ? 'nickname' : (user.displayPreference || 'nickname');
      setEditDisplayPreference(pref as 'realName' | 'nickname');
      setShowLeaderboard(user.showLeaderboard ?? false);
      setShowRank(user.showRank ?? true);
    }
  }, [user]);

  if (!user) {
    navigate('/');
    return null;
  }

  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  
  useEffect(() => {
    setAllClasses(getAllClassNames());
  }, []);

  // Listen for practice quiz start event
  useEffect(() => {
    const handlePracticeQuizStart = (event: CustomEvent<{ questionIds: string[] }>) => {
      const { questionIds } = event.detail;
      startQuiz(undefined, questionIds);
      setActiveTab("practice"); // Switch to practice tab if not already there
    };

    window.addEventListener("startPracticeQuiz", handlePracticeQuizStart as EventListener);
    return () => {
      window.removeEventListener("startPracticeQuiz", handlePracticeQuizStart as EventListener);
    };
  }, []);
  
  useEffect(() => {
    if (selectedClass) {
      // Clear loader cache so we always re-fetch the latest units list from JSON
      clearCache();
      console.log(`[StudentDashboard] Loading units for class: ${selectedClass} from JSON files only`);
      getUnitsForClass(selectedClass).then(setUnits);
      // Fetch question counts per unit for dropdown progress display
      getUnitsForClass(selectedClass).then(async (unitNames) => {
        const entries = await Promise.all(
          unitNames.map(async (u) => {
            const q = await getQuestionsForUnit(selectedClass, u);
            console.log(`[StudentDashboard] Unit "${u}": ${q.length} questions loaded from JSON`);
            return [u, q.length] as const;
          })
        );
        setUnitQuestionCounts(Object.fromEntries(entries));
      });
    } else {
      setUnits([]);
      setUnitQuestionCounts({});
    }
  }, [selectedClass]);
  
  const userClasses = user.apClasses || [];
  const availableClasses = allClasses.filter(c => !userClasses.includes(c));
  
  // Set default leaderboard class
  const currentLeaderboardClass = leaderboardClass || userClasses[0] || "";

  // Handle profile view rank toggle default based on student's rank
  useEffect(() => {
    if (viewingStudent && currentLeaderboardClass) {
      const globalLeaderboard = getLeaderboard(currentLeaderboardClass);
      const studentRank = globalLeaderboard.findIndex(u => u.id === viewingStudent.id) + 1;
      const isTopThree = studentRank > 0 && studentRank <= 3;
      setProfileViewShowRank(isTopThree);
    }
  }, [viewingStudent?.id, currentLeaderboardClass]);

  // Handle profile view rank toggle default based on student's rank
  useEffect(() => {
    if (viewingStudent && currentLeaderboardClass) {
      const globalLeaderboard = getLeaderboard(currentLeaderboardClass);
      const studentRank = globalLeaderboard.findIndex(u => u.id === viewingStudent.id) + 1;
      const isTopThree = studentRank > 0 && studentRank <= 3;
      setProfileViewShowRank(isTopThree);
    }
  }, [viewingStudent?.id, currentLeaderboardClass]);

  // Check for saved progress
  const getSavedProgress = (apClass: string, unit: string): QuizProgress | null => {
    return getQuizProgress(user.id, apClass, unit);
  };

  const handleAddClass = (className: string) => {
    addClass(className);
    toast.success(`Added ${className}!`);
    setIsAddClassOpen(false);
  };

  const handleRemoveClass = (className: string) => {
    if (userClasses.length === 1) {
      toast.error("You must have at least one class");
      return;
    }
    removeClass(className);
    toast.success(`Removed ${className}`);
    if (selectedClass === className) {
      setSelectedClass("");
      setSelectedUnit("");
    }
  };

  const startQuiz = async (resumeProgress?: QuizProgress, filteredQuestionIds?: string[]) => {
    const classToUse = resumeProgress?.apClass || selectedClass;
    const unitToUse = resumeProgress?.unit || selectedUnit;
    
    // Clear cache to ensure we get fresh data from JSON
    clearCache();
    
    let unitQuestions: Question[] = [];
    
    if (filteredQuestionIds && filteredQuestionIds.length > 0) {
      // Load specific questions by ID
      console.log(`[StudentDashboard] Starting practice quiz with ${filteredQuestionIds.length} filtered questions`);
      const { getQuestionById } = await import("@/lib/jsonLoader");
      const loadedQuestions = await Promise.all(
        filteredQuestionIds.map(id => getQuestionById(id))
      );
      unitQuestions = loadedQuestions.filter((q): q is Question => q !== null);
      
      if (unitQuestions.length === 0) {
        toast.error("No valid questions found for practice. Please try again.");
        return;
      }
      
      // Determine class from first question if available
      if (!classToUse && unitQuestions.length > 0) {
        // Try to infer class from question IDs or use first available class
        const firstClass = userClasses[0];
        if (firstClass) {
          setSelectedClass(firstClass);
          toast.success(`Starting practice quiz with ${unitQuestions.length} questions targeting your weak skills!`);
        }
      }
    } else {
      // Normal quiz flow
      if (!classToUse || !unitToUse) {
        toast.error("Please select a class and unit first");
        return;
      }
      
      console.log(`[StudentDashboard] Starting quiz - Loading questions from JSON for ${classToUse} - ${unitToUse}`);
      unitQuestions = await getQuestionsForUnit(classToUse, unitToUse);
      console.log(`[StudentDashboard] Loaded ${unitQuestions.length} questions from JSON file`);
      
      // Log first few question IDs to verify they're from JSON
      if (unitQuestions.length > 0) {
        console.log(`[StudentDashboard] First 5 question IDs from JSON:`, 
          unitQuestions.slice(0, 5).map(q => ({ id: q.id, text: q.questionText.substring(0, 50) + '...' })));
      }
      
      if (unitQuestions.length === 0) {
        toast.error("No questions available for this unit. Check that the JSON file contains questions for this unit.");
        console.error(`[StudentDashboard] No questions found for ${classToUse} - ${unitToUse}. Check JSON file.`);
        return;
      }
    }
    
    setActiveQuizClass(classToUse || userClasses[0] || "");
    setQuestions(unitQuestions);
    console.log(`[StudentDashboard] Set ${unitQuestions.length} questions in state. First question ID: ${unitQuestions[0]?.id}`);
    
    if (resumeProgress) {
      // Resume from saved progress
      setCurrentQuestionIndex(resumeProgress.currentIndex);
      setCorrectAnswers(resumeProgress.correctAnswers);
      setAnsweredQuestions(resumeProgress.answeredQuestions);
      setSessionPointsEarned(resumeProgress.pointsEarned);
      setSelectedUnit(resumeProgress.unit);
      setSessionCorrectAnswers(resumeProgress.sessionCorrectAnswers || 0);
      setSessionTotalAnswered(resumeProgress.sessionTotalAnswered || 0);
      toast.success("Resuming where you left off!");
    } else {
      // Fresh start
      setCurrentQuestionIndex(0);
      setCorrectAnswers(0);
      setAnsweredQuestions([]);
      setQuestionResults({});
      setSessionPointsEarned(0);
      setSessionCorrectAnswers(0);
      setSessionTotalAnswered(0);
    }
    
    setQuestionStartTime(Date.now());
    setElapsedTime(0);
    setIsQuizActive(true);
    setQuizComplete(false);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowQuestionNav(false);
  };

  const startPracticeQuiz = async (questionIds: string[]) => {
    if (questionIds.length === 0) {
      toast.error("No practice questions available");
      return;
    }
    await startQuiz(undefined, questionIds);
    toast.success(`Starting practice quiz with ${questionIds.length} questions targeting your weak skills!`);
  };

  const handleAnswerSelect = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
  };

  const submitAnswer = () => {
    if (!selectedAnswer) {
      toast.error("Please select an answer");
      return;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    const questionId = currentQuestion.id || `${activeQuizClass}:${selectedUnit}:${currentQuestionIndex}`;
    const isCorrect = selectedAnswer === currentQuestion.correctAnswerId;

    // Reset result view until confidence is chosen
    setShowResult(false);
    
    // Calculate time taken (capture before confidence prompt so timing is fair)
    const timeTaken = (Date.now() - questionStartTime) / 1000;

    // Get mastery data before recording attempt
    const recentCorrects = getQuestionCorrectTimestamps(user.id, questionId);

    // Open confidence prompt and defer saving until student sets confidence
    setPendingAnswer({
      questionId,
      isCorrect,
      timeTaken,
      recentCorrects,
      selectedAnswer: selectedAnswer || "",
    });
    setPendingConfidence(null);
    setShowConfidencePrompt(true);
  };

  const finalizeAnswer = (confidenceValue: number) => {
    if (!pendingAnswer) return;
    const { questionId, isCorrect, timeTaken, recentCorrects, selectedAnswer } = pendingAnswer;

    // Play sound effect after confidence is provided
    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }

    const attemptNumber = recordQuestionAttempt(
      user.id,
      questionId,
      isCorrect,
      timeTaken,
      selectedAnswer,
      confidenceValue,
      new Date().toISOString()
    );

    const scoringResult = calculateQuestionPoints(isCorrect, attemptNumber, timeTaken, recentCorrects);
    setLastScoringResult(scoringResult);

    setSessionTotalAnswered(prev => prev + 1);

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setSessionCorrectAnswers(prev => prev + 1);

      if (scoringResult.finalQuestionPoints > 0) {
        setSessionPointsEarned(prev => prev + scoringResult.finalQuestionPoints);
      }

      if (scoringResult.finalQuestionPoints > 0) {
        const breakdown = formatPointsBreakdown(scoringResult);
        toast.success(`+${scoringResult.finalQuestionPoints} pts! (${breakdown})`);
      } else if (attemptNumber > 2) {
        toast.success("Correct! (No points - 3rd+ attempt)");
      }
    }

    setQuestionResults(prev => ({ ...prev, [currentQuestionIndex]: isCorrect }));

    if (!answeredQuestions.includes(currentQuestionIndex)) {
      setAnsweredQuestions(prev => [...prev, currentQuestionIndex]);
    }

    setShowResult(true);
    setShowConfidencePrompt(false);
    setPendingAnswer(null);
    setPendingConfidence(null);
  };

  const jumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuestionStartTime(Date.now());
    setElapsedTime(0);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const newIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newIndex);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionStartTime(Date.now()); // Reset timer for next question
      setElapsedTime(0);
      
      // Save progress after each question
      saveQuizProgress(user.id, {
        apClass: activeQuizClass,
        unit: selectedUnit,
        currentIndex: newIndex,
        correctAnswers,
        answeredQuestions: [...answeredQuestions, currentQuestionIndex],
        pointsEarned: sessionPointsEarned,
        sessionCorrectAnswers,
        sessionTotalAnswered
      });
    } else {
      // Quiz complete - calculate session bonuses
      const dailyPointsSoFar = getDailyPointsEarned(user.id);
      const currentStreak = user.streak || 0;
      
      const sessionResult = calculateSessionBonus(
        sessionPointsEarned,
        sessionCorrectAnswers,
        sessionTotalAnswered,
        currentStreak,
        dailyPointsSoFar
      );
      
      // Apply final session points to leaderboard
      if (sessionResult.finalSessionPoints > 0) {
        updateScore(user.id, sessionResult.finalSessionPoints, activeQuizClass);
        addDailyPoints(user.id, sessionResult.finalSessionPoints);
      }
      
      clearQuizProgress(user.id, activeQuizClass, selectedUnit);
      
      saveQuizResult({
        userId: user.id,
        apClass: activeQuizClass,
        unit: selectedUnit,
        score: correctAnswers,
        totalQuestions: questions.length,
        pointsEarned: sessionResult.finalSessionPoints
      });
      
      // Store session result for display
      setSessionPointsEarned(sessionResult.finalSessionPoints);
      
      refreshUser();
      setQuizComplete(true);
      
      if (correctAnswers === questions.length) {
        toast.success(`Perfect score! +${sessionResult.finalSessionPoints} total pts`);
      } else if (correctAnswers >= questions.length * 0.7) {
        toast.success(`Great job! +${sessionResult.finalSessionPoints} total pts`);
      }
    }
  };

  const exitQuiz = () => {
    // Save progress before exiting - also apply partial points
    if (!quizComplete && sessionTotalAnswered > 0) {
      const dailyPointsSoFar = getDailyPointsEarned(user.id);
      const currentStreak = user.streak || 0;
      
      const sessionResult = calculateSessionBonus(
        sessionPointsEarned,
        sessionCorrectAnswers,
        sessionTotalAnswered,
        currentStreak,
        dailyPointsSoFar
      );
      
      // Apply earned points immediately
      if (sessionResult.finalSessionPoints > 0) {
        updateScore(user.id, sessionResult.finalSessionPoints, activeQuizClass);
        addDailyPoints(user.id, sessionResult.finalSessionPoints);
      }
      
      saveQuizProgress(user.id, {
        apClass: activeQuizClass,
        unit: selectedUnit,
        currentIndex: currentQuestionIndex,
        correctAnswers,
        answeredQuestions,
        pointsEarned: 0, // Reset since we already applied points
        sessionCorrectAnswers: 0,
        sessionTotalAnswered: 0
      });
      
      toast.success(`Progress saved! +${sessionResult.finalSessionPoints} pts earned`);
      refreshUser();
    }
    
    setIsQuizActive(false);
    setQuizComplete(false);
    setSelectedUnit("");
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success("Logged out successfully");
  };

  const handleSaveSettings = () => {
    updateProfile({
      firstName: editFirstName,
      lastName: editLastName,
      nickname: editNickname, // This won't actually change since field is disabled, but keeping for consistency
      displayPreference: editDisplayPreference as 'realName' | 'nickname',
      showLeaderboard: showLeaderboard,
      showRank: showRank
    });
    refreshUser(); // Refresh user state to ensure UI updates
    toast.success("Settings saved!");
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-gold" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-silver" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-bronze" />;
    return <span className="text-xs font-bold text-muted-foreground">#{rank}</span>;
  };

  const getBestRank = () => {
    const bestRank = userClasses.reduce((best, c) => {
      const lb = getLeaderboard(c);
      const rank = lb.findIndex(u => u.id === user.id) + 1;
      if (rank > 0 && (best === 0 || rank < best)) return rank;
      return best;
    }, 0);
    return bestRank > 0 ? `#${bestRank}` : '-';
  };

  // Quiz Active View
  if (isQuizActive && !quizComplete) {
    const currentQuestion = questions[currentQuestionIndex];
    const questionId = `${activeQuizClass}:${selectedUnit}:${currentQuestionIndex}`;
    const currentAttempts = getQuestionAttempts(user.id, questionId);
    
    // Log the current question being displayed to verify it's from JSON
    if (currentQuestion) {
      console.log(`[StudentDashboard] Displaying question ${currentQuestionIndex + 1}/${questions.length}:`, {
        id: currentQuestion.id,
        questionText: currentQuestion.questionText.substring(0, 100) + '...',
        optionsCount: currentQuestion.options.length,
        correctAnswerId: currentQuestion.correctAnswerId
      });
    }
    
    return (
      <div className="min-h-screen bg-background">
        <header className="gradient-secondary text-secondary-foreground py-4">
          <div className="container mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6" />
              <div>
                <span className="font-bold">{activeQuizClass}</span>
                <span className="mx-2 opacity-50">•</span>
                <span className="opacity-80">{selectedUnit}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm opacity-80">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowQuestionNav(!showQuestionNav)} 
                className={`text-secondary-foreground hover:bg-secondary-foreground/10 ${showQuestionNav ? 'bg-secondary-foreground/20' : ''}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={exitQuiz} className="text-secondary-foreground hover:bg-secondary-foreground/10" disabled={showConfidencePrompt}>
                Save & Exit
              </Button>
            </div>
          </div>
          <div className="container mx-auto px-6 mt-3">
            <div className="h-2 bg-secondary-foreground/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-secondary-foreground transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </header>

        {/* Question Navigation Panel */}
        {showQuestionNav && (
          <div className="bg-card border-b border-border py-4 animate-fade-in">
            <div className="container mx-auto px-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Jump to Question</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-success"></span> Correct
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-destructive"></span> Incorrect
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-muted border border-border"></span> Unanswered
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {questions.map((_, index) => {
                  const isAnswered = answeredQuestions.includes(index);
                  const isCorrect = questionResults[index];
                  const isCurrent = index === currentQuestionIndex;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => jumpToQuestion(index)}
                      className={`w-10 h-10 rounded-lg font-medium text-sm transition-all
                        ${isCurrent ? 'ring-2 ring-secondary ring-offset-2' : ''}
                        ${!isAnswered ? 'bg-muted text-muted-foreground hover:bg-muted/80' : ''}
                        ${isAnswered && isCorrect ? 'bg-success text-success-foreground' : ''}
                        ${isAnswered && !isCorrect ? 'bg-destructive text-destructive-foreground' : ''}
                      `}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <main className="container mx-auto px-6 py-12 max-w-3xl">
            <Card
              variant="elevated"
              className="animate-fade-in"
              style={{ overflow: "visible", height: "auto" }}
            >
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                  <CardTitle
                    className="text-xl md:text-2xl leading-relaxed"
                    style={{ overflow: "visible", wordBreak: "break-word", whiteSpace: "normal" }}
                  >
                    <MathText text={currentQuestion.questionText} />
                  </CardTitle>
              </div>
              {currentAttempts > 0 && (
                <p className="text-sm text-muted-foreground">
                  {currentAttempts === 1 ? "1 previous attempt (next correct = half points)" : 
                   currentAttempts >= 2 ? `${currentAttempts} attempts (no points available)` : ""}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Timer Bar */}
              {!showResult && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Speed Bonus</span>
                    <span>{Math.max(0, Math.round(TIMER_DURATION - elapsedTime))}s</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-100 ${
                        elapsedTime < TIMER_DURATION * 0.5 ? 'bg-success' :
                        elapsedTime < TIMER_DURATION * 0.8 ? 'bg-warning' : 'bg-destructive'
                      }`}
                      style={{ width: `${Math.max(0, ((TIMER_DURATION - elapsedTime) / TIMER_DURATION) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option.id;
                const isCorrectOption = option.id === currentQuestion.correctAnswerId;
                const showCorrect = showResult && isCorrectOption;
                const showWrong = showResult && isSelected && !isCorrectOption;

                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(option.id)}
                    disabled={showResult}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-4
                      ${isSelected && !showResult ? 'border-secondary bg-secondary/10' : 'border-border'}
                      ${showCorrect ? 'border-success bg-success/10' : ''}
                      ${showWrong ? 'border-destructive bg-destructive/10' : ''}
                      ${!showResult ? 'hover:border-secondary hover:bg-secondary/5' : ''}
                    `}
                    >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                      ${isSelected && !showResult ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}
                      ${showCorrect ? 'bg-success text-success-foreground' : ''}
                      ${showWrong ? 'bg-destructive text-destructive-foreground' : ''}
                    `}>
                      {option.id}
                    </span>
                    <div
                      className="flex-1 font-medium whitespace-pre-wrap leading-relaxed"
                      style={{ overflow: "visible", wordBreak: "break-word", whiteSpace: "normal", height: "auto" }}
                    >
                      <MathText text={option.content} />
                    </div>
                    {showCorrect && <CheckCircle className="w-6 h-6 text-success" />}
                    {showWrong && <XCircle className="w-6 h-6 text-destructive" />}
                  </button>
                );
              })}

              {showResult && (
                <div className="mt-4 p-4 rounded-xl border bg-muted/40 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {questionResults[currentQuestionIndex] ? (
                      <span className="text-success">Correct</span>
                    ) : (
                      <span className="text-destructive">Incorrect</span>
                    )}
                  </div>
                  {currentQuestion.explanation && (
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      <MathText text={currentQuestion.explanation} />
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4">
                {!showResult ? (
              <Button variant="student" size="lg" className="w-full" onClick={submitAnswer} disabled={!selectedAnswer || showConfidencePrompt}>
                    Submit Answer
                  </Button>
                ) : (
                  <Button variant="student" size="lg" className="w-full" onClick={nextQuestion}>
                    {currentQuestionIndex < questions.length - 1 ? (
                      <>Next Question <ArrowRight className="w-5 h-5 ml-2" /></>
                    ) : 'Finish Quiz'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Confidence Prompt (active quiz) */}
        <Dialog
          open={showConfidencePrompt}
          onOpenChange={(open) => {
            if (!open) {
              setShowConfidencePrompt(false);
              setPendingAnswer(null);
              setPendingConfidence(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>How confident are you in this answer?</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((value) => (
                  <Button
                    key={value}
                    variant="outline"
                    onClick={() => finalizeAnswer(value)}
                  >
                    {value === 1 && "Not sure"}
                    {value === 2 && "Somewhat sure"}
                    {value === 3 && "Very sure"}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Pick one to save your answer and see immediately if you were correct.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Quiz Complete View
  if (quizComplete) {
    const accuracy = correctAnswers / questions.length;
    const percentage = Math.round(accuracy * 100);

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card variant="elevated" className="w-full max-w-lg text-center animate-scale-in">
          <CardHeader>
            <div className="w-20 h-20 mx-auto rounded-full gradient-secondary flex items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-secondary-foreground" />
            </div>
            <CardTitle className="text-3xl">Quiz Complete!</CardTitle>
            <CardDescription className="text-lg">{activeQuizClass} • {selectedUnit}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted">
                <div className="text-3xl font-bold text-secondary">{correctAnswers}/{questions.length}</div>
                <div className="text-sm text-muted-foreground">Correct Answers</div>
              </div>
              <div className="p-4 rounded-xl bg-muted">
                <div className="text-3xl font-bold text-secondary">{percentage}%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
            </div>

            {/* Points Summary */}
            <div className="p-4 rounded-xl border-2 border-secondary bg-secondary/5 space-y-3">
              <div className="text-4xl font-bold text-secondary">+{sessionPointsEarned}</div>
              <div className="text-sm text-muted-foreground">Points Earned This Session</div>
              <p className="text-xs text-muted-foreground">
                Base 10pts × attempt multiplier × speed bonus × mastery penalty
              </p>
              <p className="text-xs text-muted-foreground">
                + accuracy bonus (above 70%) × streak multiplier (up to +40%)
              </p>
            </div>

            <div className="text-muted-foreground">
              {percentage === 100 ? '🎉 Perfect Score!' : 
               percentage >= 80 ? '🌟 Excellent!' :
               percentage >= 60 ? '👍 Good job!' : 
               '📚 Keep practicing!'}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" size="lg" className="flex-1" onClick={exitQuiz}>
                Back to Dashboard
              </Button>
              <Button variant="student" size="lg" className="flex-1" onClick={() => startQuiz()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <header className="gradient-secondary text-secondary-foreground">
        <div className="container mx-auto px-12 py-5">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-6 flex-shrink-0">
              <div className="w-14 h-14 rounded-xl bg-secondary-foreground/20 flex items-center justify-center">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <h1 className="font-bold text-2xl md:text-3xl">{getDisplayName(user)}</h1>
              </div>
            </div>
            
            {/* Quick Stats in Header */}
            <div className="hidden sm:flex items-center gap-10 lg:gap-12 xl:gap-16 flex-1 justify-center mx-8 lg:mx-12">
              <div className="flex items-center gap-4">
                <Star className="w-7 h-7 md:w-8 md:h-8" />
                <span className="font-bold text-2xl md:text-3xl">{getTotalScore(user)} pts</span>
              </div>
              <div className="flex items-center gap-4">
                <Flame className="w-7 h-7 md:w-8 md:h-8" />
                <span className="font-bold text-2xl md:text-3xl">{user.streak} day</span>
              </div>
              {showRank && (
              <div className="flex items-center gap-4">
                <Trophy className="w-7 h-7 md:w-8 md:h-8" />
                <span className="font-bold text-2xl md:text-3xl">{getBestRank()}</span>
                </div>
              )}
              {/* Rank Toggle */}
              <div className="flex items-center gap-4 px-5 py-3 rounded-lg bg-secondary-foreground/10">
                <Trophy className="w-7 h-7 md:w-8 md:h-8" />
                <Switch
                  checked={showRank}
                  onCheckedChange={(checked) => {
                    setShowRank(checked);
                    updateProfile({ showRank: checked });
                    refreshUser();
                  }}
                  className="scale-110"
                />
                <span className="text-lg md:text-xl font-bold">Rank</span>
              </div>
            </div>
            
            <Button variant="ghost" size="lg" onClick={handleLogout} className="text-secondary-foreground hover:bg-secondary-foreground/10 h-14 text-xl md:text-2xl font-bold px-6 flex-shrink-0">
              <LogOut className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 sm:mr-3" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
          
          {/* Mobile Stats */}
          <div className="flex sm:hidden items-center justify-center gap-6 mt-4 pt-4 border-t border-secondary-foreground/20">
            <div className="flex items-center gap-3 text-lg">
              <Star className="w-6 h-6" />
              <span className="font-bold">{getTotalScore(user)}</span>
            </div>
            <div className="flex items-center gap-3 text-lg">
              <Flame className="w-6 h-6" />
              <span className="font-bold">{user.streak}</span>
            </div>
            {showRank && (
            <div className="flex items-center gap-3 text-lg">
              <Trophy className="w-6 h-6" />
              <span className="font-bold">{getBestRank()}</span>
              </div>
            )}
            {/* Mobile Rank Toggle */}
            <div className="flex items-center gap-3 text-lg px-4 py-2 rounded bg-secondary-foreground/10">
              <Trophy className="w-5 h-5" />
              <Switch
                checked={showRank}
                onCheckedChange={(checked) => {
                  setShowRank(checked);
                  updateProfile({ showRank: checked });
                  refreshUser();
                }}
                className="scale-100"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-4 px-2 max-w-[98vw]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-20">
            <TabsTrigger value="practice" className="text-lg md:text-xl font-bold">
              <Play className="w-6 h-6 md:w-7 md:h-7 mr-2" />
              Practice
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-lg md:text-xl font-bold">
              <Grid3X3 className="w-6 h-6 md:w-7 md:h-7 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-lg md:text-xl font-bold">
              <Trophy className="w-6 h-6 md:w-7 md:h-7 mr-2" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="classes" className="text-lg md:text-xl font-bold">
              <BookOpen className="w-6 h-6 md:w-7 md:h-7 mr-2" />
              Classes
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-lg md:text-xl font-bold">
              <Settings className="w-6 h-6 md:w-7 md:h-7 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Practice Tab */}
          <TabsContent value="practice" className="space-y-4 animate-fade-in">
            <Card variant="elevated">
              <CardHeader className="pb-5 px-8 pt-6">
                <CardTitle className="flex items-center gap-4 text-3xl md:text-4xl lg:text-5xl font-bold">
                  <Play className="w-8 h-8 md:w-9 md:h-9 text-secondary" />
                  Start a Quiz
                </CardTitle>
                <CardDescription className="text-xl md:text-2xl mt-3">Choose a class and unit to practice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-8 pb-6">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xl md:text-2xl font-bold text-foreground">Class</label>
                    <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedUnit(""); }}>
                      <SelectTrigger className="h-20 text-xl">
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {userClasses.map((className) => (
                          <SelectItem key={className} value={className} className="text-xl">
                            {className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xl md:text-2xl font-bold text-foreground">Unit</label>
                    <Select value={selectedUnit} onValueChange={setSelectedUnit} disabled={!selectedClass}>
                      <SelectTrigger className="h-20 text-xl">
                        <SelectValue placeholder={selectedClass ? "Select a unit" : "Select class first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => {
                          const progress = getSavedProgress(selectedClass, unit);
                          const total = unitQuestionCounts[unit];
                          const answered = progress ? progress.answeredQuestions.length : 0;
                          return (
                            <SelectItem key={unit} value={unit} className="text-xl">
                              {unit}{" "}
                              {total !== undefined
                                ? `(Questions answered: ${answered}/${total})`
                                : progress
                                  ? `(Questions answered: ${answered}/?)`
                                  : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {selectedClass && selectedUnit && (() => {
                  const progress = getSavedProgress(selectedClass, selectedUnit);
                  return progress ? (
                    <div className="flex gap-4">
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className="flex-1 h-20 text-xl font-bold"
                        onClick={() => {
                          clearQuizProgress(user.id, selectedClass, selectedUnit);
                          startQuiz();
                        }}
                      >
                        Start Fresh
                      </Button>
                      <Button 
                        variant="student" 
                        size="lg" 
                        className="flex-1 h-20 text-2xl font-bold"
                        onClick={() => startQuiz(progress)}
                      >
                        <Play className="w-7 h-7 mr-2" />
                        Continue
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="student" 
                      size="lg" 
                      className="w-full h-20 text-2xl font-bold"
                      onClick={() => startQuiz()}
                    >
                      <Play className="w-7 h-7 mr-2" />
                      Start Quiz
                    </Button>
                  );
                })()}
                
                {(!selectedClass || !selectedUnit) && (
                  <Button 
                    variant="student" 
                    size="lg" 
                    className="w-full h-20 text-2xl font-bold"
                    disabled
                  >
                    <Play className="w-7 h-7 mr-2" />
                    Start Quiz
                  </Button>
                )}
                
                <p className="text-lg md:text-xl text-muted-foreground text-center">
                  Speed bonus • Streak multiplier • Accuracy bonus • Daily cap: 2000pts
                </p>
              </CardContent>
            </Card>

            {/* Practice Weak Skills Section */}
            <PracticeWeakSkillsCard 
              userId={user.id}
              userClasses={userClasses}
              selectedClass={selectedClass}
              selectedUnit={selectedUnit}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4 animate-fade-in">
            <AnalyticsDashboard userId={user.id} classNames={userClasses} />
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4 animate-fade-in">
            {!showLeaderboard ? (
              <Card variant="elevated">
                <CardContent className="py-12 text-center px-8">
                  <EyeOff className="w-24 h-24 mx-auto mb-5 text-muted-foreground opacity-50" />
                  <CardTitle className="mb-4 text-3xl md:text-4xl lg:text-5xl font-bold">Leaderboard is Hidden</CardTitle>
                  <CardDescription className="mb-6 text-xl md:text-2xl">
                    Enable the leaderboard in Settings to view rankings and compare your progress with others.
                  </CardDescription>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="h-16 text-xl font-bold"
                    onClick={() => setActiveTab("settings")}
                  >
                    Go to Settings
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
            {userClasses.length > 1 && (
              <Select value={currentLeaderboardClass} onValueChange={setLeaderboardClass}>
                <SelectTrigger className="w-full h-16 text-lg">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {userClasses.map((className) => (
                    <SelectItem key={className} value={className} className="text-lg">
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {currentLeaderboardClass && (() => {
                  // Global leaderboard (all students in this AP class)
                  const globalLeaderboard = getLeaderboard(currentLeaderboardClass);
                  const globalUserRank = globalLeaderboard.findIndex(u => u.id === user.id) + 1;
                  
                  // Class leaderboard (only students who joined via the same class code)
                  const classCode = getClassCodeForStudent(user.id, currentLeaderboardClass);
                  const classLeaderboardEnabled = classCode ? isClassLeaderboardEnabled(classCode) : false;
                  const classStudents = classCode ? getStudentsInSameClass(user.id, currentLeaderboardClass) : [];
                  const classLeaderboard = classStudents
                    .filter(s => s.apClasses.includes(currentLeaderboardClass))
                    .sort((a, b) => (getClassScore(b, currentLeaderboardClass) || 0) - (getClassScore(a, currentLeaderboardClass) || 0));
                  const classUserRank = classLeaderboard.findIndex(u => u.id === user.id) + 1;

              return (
                    <div className="space-y-6">
                      {/* Class Leaderboard (if student joined via class code and teacher enabled it) */}
                      {classCode && classLeaderboard.length > 0 && classLeaderboardEnabled && (
                <Card variant="elevated">
                  <CardHeader className="pb-5 px-8 pt-8">
                    <div className="flex items-center justify-between">
                          <CardTitle className="text-2xl md:text-3xl font-bold">Class Leaderboard - {currentLeaderboardClass}</CardTitle>
                          {classUserRank > 0 && showRank && (
                            <span className="text-base md:text-lg text-muted-foreground">Your rank: <strong className="text-secondary">#{classUserRank}</strong></span>
                      )}
                    </div>
                        <CardDescription className="text-lg md:text-xl mt-2">Students in your class only</CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                    <div className="space-y-3">
                          {classLeaderboard.map((student, index) => {
                        const rank = index + 1;
                        const isCurrentUser = student.id === user.id;
                        
                        return (
                          <button
                            key={student.id}
                            onClick={() => setViewingStudent(student)}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.02]
                              ${isCurrentUser ? 'bg-secondary/10 border-2 border-secondary' : 'bg-muted/50 hover:bg-muted'}
                            `}
                          >
                                {showRank && (
                            <div className="w-10 flex justify-center text-xl">{getRankIcon(rank)}</div>
                                )}
                                {!showRank && <div className="w-10" />}
                                <span className={`flex-1 font-semibold text-lg text-left ${isCurrentUser ? 'text-secondary' : ''}`}>
                                  {getDisplayName(student)}
                                  {isCurrentUser && <span className="text-sm ml-2 opacity-70">(You)</span>}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Star className="w-5 h-5 text-gold" />
                                  <span className="font-bold text-lg">{getClassScore(student, currentLeaderboardClass)}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Global Leaderboard */}
                  <Card variant="elevated">
                    <CardHeader className="pb-5 px-8 pt-8">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl md:text-3xl font-bold">Global Leaderboard - {currentLeaderboardClass}</CardTitle>
                        {globalUserRank > 0 && showRank && (
                          <span className="text-base md:text-lg text-muted-foreground">Your rank: <strong className="text-secondary">#{globalUserRank}</strong></span>
                        )}
                      </div>
                      <CardDescription className="text-lg md:text-xl mt-2">All students in {currentLeaderboardClass}</CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      <div className="space-y-3">
                        {globalLeaderboard.length > 0 ? globalLeaderboard.slice(0, 15).map((student, index) => {
                          const rank = index + 1;
                          const isCurrentUser = student.id === user.id;
                          
                          return (
                            <button
                              key={student.id}
                              onClick={() => setViewingStudent(student)}
                              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.02]
                                ${isCurrentUser ? 'bg-secondary/10 border-2 border-secondary' : 'bg-muted/50 hover:bg-muted'}
                              `}
                            >
                              {showRank && (
                                <div className="w-10 flex justify-center text-xl">{getRankIcon(rank)}</div>
                              )}
                              {!showRank && <div className="w-10" />}
                            <span className={`flex-1 font-semibold text-lg text-left ${isCurrentUser ? 'text-secondary' : ''}`}>
                              {getDisplayName(student)}
                              {isCurrentUser && <span className="text-sm ml-2 opacity-70">(You)</span>}
                            </span>
                            <div className="flex items-center gap-2">
                              <Star className="w-5 h-5 text-gold" />
                              <span className="font-bold text-lg">{getClassScore(student, currentLeaderboardClass)}</span>
                            </div>
                          </button>
                        );
                      }) : (
                        <p className="text-center text-lg text-muted-foreground py-12">
                          No students yet. Be the first to take a quiz!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </div>
              );
            })()}
              </>
            )}

            {/* Student Stats Dialog */}
            <Dialog open={!!viewingStudent} onOpenChange={(open) => !open && setViewingStudent(null)}>
              <DialogContent className="max-w-md">
                {viewingStudent && (() => {
                  const studentHistory = getUserQuizHistory(viewingStudent.id);
                  const totalQuizzes = studentHistory.length;
                  const avgAccuracy = totalQuizzes > 0 
                    ? Math.round(studentHistory.reduce((sum, q) => sum + (q.score / q.totalQuestions) * 100, 0) / totalQuizzes)
                    : 0;
                  
                  // Determine if this student is in top 3 for the current class
                  const globalLeaderboard = currentLeaderboardClass ? getLeaderboard(currentLeaderboardClass) : [];
                  const studentRank = globalLeaderboard.findIndex(u => u.id === viewingStudent.id) + 1;
                  
                  return (
                    <>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full gradient-secondary flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-secondary-foreground" />
                          </div>
                          {getDisplayName(viewingStudent)}
                        </DialogTitle>
                      </DialogHeader>
                      
                      {/* Rank Toggle in Profile View */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-muted-foreground" />
                          <Label htmlFor="profile-rank-toggle" className="text-sm font-medium">
                            Show Rank
                          </Label>
                        </div>
                        <Switch
                          id="profile-rank-toggle"
                          checked={profileViewShowRank}
                          onCheckedChange={setProfileViewShowRank}
                        />
                      </div>
                      
                      <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-3">
                          {profileViewShowRank && studentRank > 0 && currentLeaderboardClass && (
                            <div className="p-3 rounded-xl bg-muted text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Trophy className="w-4 h-4 text-gold" />
                              </div>
                              <div className="text-2xl font-bold">#{studentRank}</div>
                              <div className="text-xs text-muted-foreground">Global Rank</div>
                            </div>
                          )}
                          <div className="p-3 rounded-xl bg-muted text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Star className="w-4 h-4 text-gold" />
                            </div>
                            <div className="text-2xl font-bold">{getTotalScore(viewingStudent)}</div>
                            <div className="text-xs text-muted-foreground">Total Points</div>
                          </div>
                          <div className="p-3 rounded-xl bg-muted text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Flame className="w-4 h-4 text-orange-500" />
                            </div>
                            <div className="text-2xl font-bold">{viewingStudent.streak}</div>
                            <div className="text-xs text-muted-foreground">Day Streak</div>
                          </div>
                          <div className="p-3 rounded-xl bg-muted text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <BookOpen className="w-4 h-4 text-secondary" />
                            </div>
                            <div className="text-2xl font-bold">{totalQuizzes}</div>
                            <div className="text-xs text-muted-foreground">Quizzes Taken</div>
                          </div>
                          <div className="p-3 rounded-xl bg-muted text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <CheckCircle className="w-4 h-4 text-success" />
                            </div>
                            <div className="text-2xl font-bold">{avgAccuracy}%</div>
                            <div className="text-xs text-muted-foreground">Avg Accuracy</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">AP Classes</h4>
                          <div className="flex flex-wrap gap-2">
                            {(viewingStudent.apClasses || []).map((c) => (
                              <span key={c} className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        {studentHistory.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Activity</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {studentHistory.slice(0, 5).map((quiz, i) => (
                                <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                                  <span className="truncate flex-1">{quiz.unit}</span>
                                  <span className="font-medium text-secondary">{quiz.score}/{quiz.totalQuestions}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-4 animate-fade-in">
            {/* Join Class by Code Section */}
            <Card variant="elevated">
              <CardHeader className="pb-5 px-8 pt-6">
                <CardTitle className="flex items-center gap-4 text-3xl md:text-4xl lg:text-5xl font-bold">
                  <GraduationCap className="w-8 h-8 md:w-9 md:h-9 text-secondary" />
                  Join a Class
                </CardTitle>
                <CardDescription className="text-xl md:text-2xl mt-3">Enter a class code from your teacher to join their class</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-8 pb-6">
                <div className="flex gap-4">
                  <Input
                    placeholder="Enter class code (e.g., ABC123)"
                    value={classCodeInput}
                    onChange={(e) => setClassCodeInput(e.target.value.toUpperCase())}
                    className="h-20 font-mono text-2xl md:text-3xl tracking-wider"
                    maxLength={6}
                    disabled={isJoiningClass}
                  />
                  <Button
                    variant="student"
                    size="lg"
                    className="h-20 text-xl md:text-2xl font-bold px-10"
                    onClick={async () => {
                      if (!classCodeInput.trim()) {
                        toast.error("Please enter a class code");
                        return;
                      }
                      if (classCodeInput.length !== 6) {
                        toast.error("Class code must be 6 characters");
                        return;
                      }
                      
                      setIsJoiningClass(true);
                      const result = joinClassByCode(user.id, classCodeInput.trim());
                      setIsJoiningClass(false);
                      
                      if (result.success) {
                        toast.success(`Successfully joined ${result.class?.apClassName}!`);
                        setClassCodeInput("");
                        refreshUser();
                      } else {
                        toast.error(result.message);
                      }
                    }}
                    disabled={isJoiningClass || !classCodeInput.trim()}
                  >
                    {isJoiningClass ? (
                      <div className="w-7 h-7 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-6 h-6 mr-2" />
                        Join
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-lg md:text-xl text-muted-foreground">
                  Ask your teacher for the 6-character class code to join their class
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">My AP Classes ({userClasses.length})</h2>
              <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="h-14 text-lg font-bold">
                    <Plus className="w-6 h-6 mr-2" />
                    Add Class
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add AP Class</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-64 mt-4">
                    <div className="space-y-2">
                      {availableClasses.map((className) => (
                        <button
                          key={className}
                          onClick={() => handleAddClass(className)}
                          className="w-full p-3 rounded-lg border hover:bg-muted transition-colors text-left font-medium"
                        >
                          {className}
                        </button>
                      ))}
                      {availableClasses.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          You're enrolled in all available classes!
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-3">
              {userClasses.map((className) => (
                <Card key={className} variant="elevated">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-xl md:text-2xl lg:text-3xl">{className}</h3>
                        <p className="text-lg md:text-xl text-muted-foreground mt-2">
                          {units.length} units • {getClassScore(user, className)} pts
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-14 text-lg font-bold"
                          onClick={() => {
                            setSelectedClass(className);
                            setSelectedUnit("");
                            setActiveTab("practice");
                          }}
                        >
                          <Play className="w-6 h-6 mr-2" />
                          Practice
                        </Button>
                        <Button
                          variant="ghost"
                          size="lg"
                          className="h-14 w-14 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveClass(className)}
                        >
                          <Trash2 className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 animate-fade-in">
            <Card variant="elevated">
              <CardHeader className="pb-5 px-8 pt-6">
                <CardTitle className="flex items-center gap-4 text-3xl md:text-4xl lg:text-5xl font-bold">
                  <UserIcon className="w-8 h-8 md:w-9 md:h-9 text-secondary" />
                  Profile Settings
                </CardTitle>
                <CardDescription className="text-xl md:text-2xl mt-3">Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-8 pb-6">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName" className="text-xl md:text-2xl font-bold">First Name</Label>
                    <Input
                      id="editFirstName"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="h-20 text-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName" className="text-xl md:text-2xl font-bold">Last Name</Label>
                    <Input
                      id="editLastName"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="h-20 text-xl"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editNickname" className="text-xl md:text-2xl font-bold">Anonymous Nickname</Label>
                  <Input
                    id="editNickname"
                    value={editNickname}
                    disabled
                    className="bg-muted cursor-not-allowed h-20 text-xl"
                    placeholder="Auto-generated"
                  />
                  <p className="text-lg md:text-xl text-muted-foreground">
                    Your nickname is auto-generated and cannot be changed. This ensures privacy and uniqueness.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader className="pb-5 px-8 pt-6">
                <CardTitle className="flex items-center gap-4 text-3xl md:text-4xl lg:text-5xl font-bold">
                  <Trophy className="w-8 h-8 md:w-9 md:h-9 text-secondary" />
                  Leaderboard Settings
                </CardTitle>
                <CardDescription className="text-xl md:text-2xl mt-3">Control leaderboard visibility and display preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-8 pb-6">
                <div className="flex items-center justify-between p-5 rounded-lg border">
                  <div className="space-y-1">
                    <Label htmlFor="show-leaderboard" className="text-xl md:text-2xl font-bold">
                      Show Leaderboard
                    </Label>
                    <p className="text-lg md:text-xl text-muted-foreground">
                      {showLeaderboard 
                        ? "Leaderboard is visible on your dashboard" 
                        : "Leaderboard is hidden from your dashboard"}
                    </p>
                  </div>
                  <Switch
                    id="show-leaderboard"
                    checked={showLeaderboard}
                    onCheckedChange={setShowLeaderboard}
                    className="scale-125"
                  />
                </div>
                <div className="flex items-center justify-between p-5 rounded-lg border">
                  <div className="space-y-1">
                    <Label htmlFor="show-rank" className="text-xl md:text-2xl font-bold">
                      Show Rank
                    </Label>
                    <p className="text-lg md:text-xl text-muted-foreground">
                      {showRank 
                        ? "Ranks are visible on leaderboards" 
                        : "Ranks are hidden on leaderboards"}
                    </p>
                  </div>
                  <Switch
                    id="show-rank"
                    checked={showRank}
                    onCheckedChange={(checked) => {
                      setShowRank(checked);
                      updateProfile({ showRank: checked });
                      refreshUser();
                    }}
                    className="scale-125"
                  />
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader className="pb-5 px-8 pt-6">
                <CardTitle className="flex items-center gap-4 text-3xl md:text-4xl lg:text-5xl font-bold">
                  <UserIcon className="w-8 h-8 md:w-9 md:h-9 text-secondary" />
                  Leaderboard Display
                </CardTitle>
                <CardDescription className="text-xl md:text-2xl mt-3">Choose how your name appears on leaderboards</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-6">
                <RadioGroup 
                  value={editDisplayPreference} 
                  onValueChange={(v) => setEditDisplayPreference(v as 'realName' | 'nickname')}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-4 p-5 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="nickname" id="nickname" className="w-6 h-6" />
                    <Label htmlFor="nickname" className="flex-1 cursor-pointer">
                      <div className="font-bold text-xl md:text-2xl">Anonymous Nickname</div>
                      <div className="text-lg md:text-xl text-muted-foreground mt-2">
                        Display as: {editNickname || user.nickname || '(Auto-generated)'}
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-4 p-5 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="realName" id="realName" className="w-6 h-6" />
                    <Label htmlFor="realName" className="flex-1 cursor-pointer">
                      <div className="font-bold text-xl md:text-2xl">Real Name</div>
                      <div className="text-lg md:text-xl text-muted-foreground mt-2">
                        Display as: {editFirstName && editLastName ? `${editFirstName} ${editLastName}` : '(Set your name above)'}
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Button variant="student" size="lg" className="w-full h-20 text-2xl font-bold" onClick={handleSaveSettings}>
              Save Settings
            </Button>

            {/* Danger Zone */}
            <div className="pt-6 mt-6 border-t border-border">
              <h3 className="text-xl md:text-2xl font-bold text-destructive mb-4">Danger Zone</h3>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <UserX className="w-4 h-4 mr-2" />
                    Delete My Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account, all your progress, quiz history, and remove you from all leaderboards. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        deleteUserAccount(user.id);
                        logout();
                        navigate('/');
                        toast.success("Account deleted");
                      }}
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
}
