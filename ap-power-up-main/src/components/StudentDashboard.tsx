import { useState, useEffect, useRef } from "react";
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
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { Question } from "@/lib/questionData";
import { getUnitsForClass, getQuestionsForUnit, getAllClassNames, clearCache, loadClassData } from "@/lib/jsonLoader";
import { Latex, MathText } from "@/components/Latex";
import { StimulusRenderer } from "@/components/StimulusRenderer";

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
  QuizResult,
  getQuestionCorrectTimestamps,
  getDailyPointsEarned,
  addDailyPoints,
  getUserStreak,
  joinClassByCode,
  getStudentsInSameClass,
  getClassCodeForStudent,
  isClassLeaderboardEnabled,
} from "@/lib/database";
import { PremiumLoader } from "@/components/ui/premium-loader";
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
import { APTestSection } from "./APTestSection";
import { APTestInterface } from "./APTestInterface";
import { APTestResults } from "./APTestResults";
import { APTestData, APTestQuestionResponse, APTestAttempt, generateAPTestAttemptId } from "@/lib/apTestData";
import { calculateAPTestSummary } from "@/lib/apTestAnalytics";
import { saveAPTestAttempt } from "@/lib/database";

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
  const [showConfidencePrompt, setShowConfidencePrompt] = useState(false);
  const [pendingConfidence, setPendingConfidence] = useState<number | null>(null);
  const [confidenceSliderValue, setConfidenceSliderValue] = useState<number[]>([3]); // Default to middle (3)
  const [pendingAnswer, setPendingAnswer] = useState<{
    questionId: string;
    isCorrect: boolean;
    timeTaken: number;
    recentCorrects: string[];
    selectedAnswer: string;
  } | null>(null);
  const [currentQuestionAttempts, setCurrentQuestionAttempts] = useState<number>(0);
  
  // AP Test state
  const [isAPTestActive, setIsAPTestActive] = useState(false);
  const [apTestData, setApTestData] = useState<APTestData | null>(null);
  const [apTestStartTime, setApTestStartTime] = useState<number>(0);
  const [apTestAttempt, setApTestAttempt] = useState<APTestAttempt | null>(null);
  const [showAPTestResults, setShowAPTestResults] = useState(false);
  
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
  const [showLeaderboard, setShowLeaderboard] = useState(true); // Default to true (show leaderboard)
  const [showRank, setShowRank] = useState(true); // Display place for user (default ON)
  const [showRankPublicly, setShowRankPublicly] = useState(true); // Display rank publicly (default ON)
  const [trackConfidence, setTrackConfidence] = useState(true);
  const [profileViewShowRank, setProfileViewShowRank] = useState(true);
  const [unitQuestionCounts, setUnitQuestionCounts] = useState<Record<string, number>>({});
  const [globalLeaderboardData, setGlobalLeaderboardData] = useState<User[]>([]);
  const [studentHistoryData, setStudentHistoryData] = useState<QuizResult[]>([]);
  const [bestRankDisplay, setBestRankDisplay] = useState<string>('-');
  const [unitProgress, setUnitProgress] = useState<Record<string, QuizProgress | null>>({});
  const [currentUnitProgress, setCurrentUnitProgress] = useState<QuizProgress | null>(null);

  // Initialize settings when user loads
  useEffect(() => {
    if (user) {
      setEditFirstName(user.firstName || "");
      setEditLastName(user.lastName || "");
      setEditNickname(user.nickname || "");
      // Default to nickname if displayPreference is username (migration)
      const pref = user.displayPreference === 'username' ? 'nickname' : (user.displayPreference || 'nickname');
      setEditDisplayPreference(pref as 'realName' | 'nickname');
      setShowLeaderboard(user.showLeaderboard ?? true); // Default to true (show leaderboard)
      setShowRank(user.showRank ?? true); // Default to true (show own rank)
      setShowRankPublicly(user.showRankPublicly ?? true); // Default to true (show rank publicly)
      setTrackConfidence(user.trackConfidence ?? true);
    }
  }, [user]);

  // Auto-save settings with debouncing for text inputs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  
  // Track when initial load is complete
  useEffect(() => {
    if (user) {
      // Wait a bit after initial load to allow state to settle
      const timer = setTimeout(() => {
        isInitialMount.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const autoSaveSettings = (
    updates: Partial<{
      firstName: string;
      lastName: string;
      displayPreference: 'realName' | 'nickname';
      showLeaderboard: boolean;
      showRank: boolean;
      showRankPublicly: boolean;
      trackConfidence: boolean;
    }>,
    currentValues: {
      firstName: string;
      lastName: string;
      displayPreference: 'realName' | 'nickname';
      showLeaderboard: boolean;
      showRank: boolean;
      showRankPublicly: boolean;
      trackConfidence: boolean;
    }
  ) => {
    // Don't auto-save during initial mount
    if (isInitialMount.current) {
      return;
    }
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce text inputs, save immediately for switches/radio
    const isTextInput = 'firstName' in updates || 'lastName' in updates;
    const delay = isTextInput ? 1000 : 0; // 1 second debounce for text, immediate for switches
    
    saveTimeoutRef.current = setTimeout(async () => {
      const profileUpdates = {
        firstName: 'firstName' in updates ? updates.firstName! : currentValues.firstName,
        lastName: 'lastName' in updates ? updates.lastName! : currentValues.lastName,
        nickname: editNickname,
        displayPreference: 'displayPreference' in updates ? updates.displayPreference! : currentValues.displayPreference,
        showLeaderboard: 'showLeaderboard' in updates ? updates.showLeaderboard! : currentValues.showLeaderboard,
        showRank: 'showRank' in updates ? updates.showRank! : currentValues.showRank,
        showRankPublicly: 'showRankPublicly' in updates ? updates.showRankPublicly! : currentValues.showRankPublicly,
        trackConfidence: 'trackConfidence' in updates ? updates.trackConfidence! : currentValues.trackConfidence
      };
      try {
        await updateProfile(profileUpdates);
        // Don't call refreshUser() after updateProfile - updateProfile already updates the user state
        // refreshUser() would overwrite with stale data if API doesn't return track_confidence
        if (isTextInput) {
          toast.success("Settings saved!");
        }
      } catch (error: any) {
        console.error('Failed to save settings:', error);
        toast.error("Failed to save settings");
      }
    }, delay);
  };

  // Auto-save firstName when it changes
  useEffect(() => {
    if (!isInitialMount.current && user && editFirstName !== (user.firstName || "")) {
      autoSaveSettings(
        { firstName: editFirstName },
        {
          firstName: editFirstName,
          lastName: editLastName,
          displayPreference: editDisplayPreference,
          showLeaderboard: showLeaderboard,
          showRank: showRank,
          showRankPublicly: showRankPublicly,
          trackConfidence: trackConfidence
        }
      );
    }
    // Only clear timeout on unmount or when firstName actually changes, not when other dependencies change
    return () => {
      // Don't clear timeout here - let autoSaveSettings manage its own timeout cleanup
    };
  }, [editFirstName, user, editLastName, editDisplayPreference, showLeaderboard, showRank, showRankPublicly, trackConfidence]);

  // Auto-save lastName when it changes
  useEffect(() => {
    if (!isInitialMount.current && user && editLastName !== (user.lastName || "")) {
      autoSaveSettings(
        { lastName: editLastName },
        {
          firstName: editFirstName,
          lastName: editLastName,
          displayPreference: editDisplayPreference,
          showLeaderboard: showLeaderboard,
          showRank: showRank,
          showRankPublicly: showRankPublicly,
          trackConfidence: trackConfidence
        }
      );
    }
    // Only clear timeout on unmount or when lastName actually changes, not when other dependencies change
    return () => {
      // Don't clear timeout here - let autoSaveSettings manage its own timeout cleanup
    };
  }, [editLastName, user, editFirstName, editDisplayPreference, showLeaderboard, showRank, showRankPublicly, trackConfidence]);

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:448',message:'useEffect triggered for units loading',data:{selectedClass,userId:user?.id,hasSelectedClass:!!selectedClass},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (selectedClass) {
      // Clear loader cache so we always re-fetch the latest units list from JSON
      clearCache();
      console.log(`[StudentDashboard] Loading units for class: ${selectedClass} from JSON files only`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:452',message:'Calling loadClassData',data:{selectedClass},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // Load classData to get exact unit names from dataset
      loadClassData(selectedClass).then(async (classData) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:454',message:'loadClassData promise resolved',data:{selectedClass,hasClassData:!!classData,unitsCount:classData?.units?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (!classData) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:455',message:'classData is null, setting empty units',data:{selectedClass},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          setUnits([]);
          setUnitQuestionCounts({});
          setUnitProgress({});
          return;
        }
        // Use exact unitName from dataset
        const unitNames = classData.units.map(u => u.unitName);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:462',message:'Setting units state',data:{selectedClass,unitNames,unitsCount:unitNames.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        setUnits(unitNames);
        // Fetch question counts per unit for dropdown progress display
        const entries = await Promise.all(
          unitNames.map(async (u) => {
            const q = await getQuestionsForUnit(selectedClass, u);
            console.log(`[StudentDashboard] Unit "${u}": ${q.length} questions loaded from JSON`);
            return [u, q.length] as const;
          })
        );
        setUnitQuestionCounts(Object.fromEntries(entries));
        // Load progress for all units
        const progressEntries = await Promise.all(
          unitNames.map(async (u) => {
            const progress = await getQuizProgress(user.id, selectedClass, u);
            return [u, progress] as const;
          })
        );
        setUnitProgress(Object.fromEntries(progressEntries));
      }).catch((error) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:481',message:'loadClassData promise rejected',data:{selectedClass,error:error?.message||String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        console.error(`[StudentDashboard] Error loading units for ${selectedClass}:`, error);
        setUnits([]);
        setUnitQuestionCounts({});
        setUnitProgress({});
      });
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:482',message:'selectedClass is empty, clearing units',data:{selectedClass},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setUnits([]);
      setUnitQuestionCounts({});
      setUnitProgress({});
    }
  }, [selectedClass, user.id]);

  // Update current unit progress when unit changes
  useEffect(() => {
    if (selectedClass && selectedUnit) {
      getQuizProgress(user.id, selectedClass, selectedUnit).then(setCurrentUnitProgress);
    } else {
      setCurrentUnitProgress(null);
    }
  }, [selectedClass, selectedUnit, user.id]);
  
  const userClasses = user.apClasses || [];
  const availableClasses = allClasses.filter(c => !userClasses.includes(c));
  
  // Set default leaderboard class
  const currentLeaderboardClass = leaderboardClass || userClasses[0] || "";

  // Handle profile view rank toggle default based on student's rank
  useEffect(() => {
    if (viewingStudent && currentLeaderboardClass) {
      getLeaderboard(currentLeaderboardClass).then((globalLeaderboard) => {
        const studentRank = globalLeaderboard.findIndex(u => u.id === viewingStudent.id) + 1;
        const isTopThree = studentRank > 0 && studentRank <= 3;
        setProfileViewShowRank(isTopThree);
      });
    }
  }, [viewingStudent?.id, currentLeaderboardClass]);

  // Load student history when viewing student dialog opens
  useEffect(() => {
    if (viewingStudent) {
      getUserQuizHistory(viewingStudent.id).then(setStudentHistoryData);
    }
  }, [viewingStudent?.id]);

  // Load leaderboard data when class changes or leaderboard tab is active
  useEffect(() => {
    if (currentLeaderboardClass && showLeaderboard) {
      getLeaderboard(currentLeaderboardClass)
        .then((leaderboard) => {
          setGlobalLeaderboardData(leaderboard);
          // Refresh user to ensure header total points are up-to-date
          refreshUser();
        })
        .catch((error) => {
          console.error('Failed to load leaderboard:', error);
        });
    }
  }, [currentLeaderboardClass, showLeaderboard]);

  // Calculate and update best rank across all user classes
  // This runs independently of showLeaderboard - rank should be calculated even if leaderboard tab is hidden
  useEffect(() => {
    if (!user || userClasses.length === 0) {
      setBestRankDisplay('-');
      return;
    }

    // Only calculate if showRank is true
    if (!showRank) {
      setBestRankDisplay('-');
      return;
    }

    // Calculate best rank across all classes
    const calculateBestRank = async () => {
      const ranks: number[] = [];
      
      for (const className of userClasses) {
        try {
          const leaderboard = await getLeaderboard(className);
          // For rank calculation, we need to include ALL users (not filtered by showRankPublicly)
          // because we need accurate ranking. Filtering only happens in display.
          // Find user's position in the sorted leaderboard
          const userIndex = leaderboard.findIndex(u => u.id === user.id);
          if (userIndex >= 0) {
            // Rank is 1-based, so add 1
            const userRank = userIndex + 1;
            ranks.push(userRank);
          }
        } catch (error) {
          console.error(`Failed to load leaderboard for ${className}:`, error);
        }
      }
      
      if (ranks.length > 0) {
        const bestRank = Math.min(...ranks);
        setBestRankDisplay(`#${bestRank}`);
      } else {
        // User doesn't have a rank yet (no scores in any class)
        setBestRankDisplay('-');
      }
    };

    calculateBestRank();
  }, [user, userClasses, showRank, user?.classScores]);


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
    
    // Normalize questions to ensure correctAnswerId is always set (handle both correctAnswerId and correctOptionId)
    const normalizedQuestions = unitQuestions.map((q, idx) => {
      // Check all possible field names for correct answer
      const correctId = q.correctAnswerId || 
                       (q as any).correctOptionId || 
                       (q as any).correct_answer_id || 
                       (q as any).correctAnswer || 
                       '';
      
      if (!correctId && q.id) {
        console.error(`[StudentDashboard] WARNING: Question ${q.id} has no correctAnswerId! Available fields:`, Object.keys(q));
      }
      
      return {
        ...q,
        correctAnswerId: correctId
      };
    });
    
    setQuestions(normalizedQuestions);
    console.log(`[StudentDashboard] Set ${normalizedQuestions.length} questions in state. First question ID: ${normalizedQuestions[0]?.id}, correctAnswerId: ${normalizedQuestions[0]?.correctAnswerId}`);
    // Debug: Log stimulus data for first question
    if (unitQuestions[0]?.stimulus) {
      console.log('[StudentDashboard] First question stimulus:', unitQuestions[0].stimulus);
      console.log('[StudentDashboard] First question stimulusMeta:', unitQuestions[0].stimulusMeta);
    }
    
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

  const submitAnswer = async () => {
    if (!selectedAnswer) {
      toast.error("Please select an answer");
      return;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    // Debug: Log stimulus data when submitting answer
    if (currentQuestion?.stimulus) {
      console.log('[StudentDashboard] Question stimulus on submit:', currentQuestion.stimulus);
    }
    const questionId = currentQuestion.id || `${activeQuizClass}:${selectedUnit}:${currentQuestionIndex}`;
    
    // Fix: Handle both correctAnswerId and correctOptionId (JSON uses correctOptionId, API might use correct_answer_id)
    // Also check if the question object has correctOptionId as a fallback
    const correctAnswerId = currentQuestion.correctAnswerId || 
                            (currentQuestion as any).correctOptionId || 
                            (currentQuestion as any).correct_answer_id || 
                            '';
    
    // Normalize both values for comparison (trim whitespace, ensure string type)
    // This handles type mismatches (string vs number) by converting both to strings
    const normalizedSelected = String(selectedAnswer).trim();
    const normalizedCorrect = String(correctAnswerId).trim();
    const isCorrect = normalizedSelected === normalizedCorrect;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:759',message:'submitAnswer called - IMMEDIATE state update',data:{selectedAnswer,normalizedSelected,correctAnswerId,normalizedCorrect,isCorrect,currentQuestionIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // FIX: Update state IMMEDIATELY to show colors right away, before any async operations
    // Previous bug: setShowResult(false) was called first, then async operations happened,
    // then setShowResult(true) was called later, causing a delay in color updates.
    // Solution: Update showResult and questionResults immediately after determining correctness,
    // then do async operations (database saves, score updates) in the background.
    setQuestionResults(prev => ({ ...prev, [currentQuestionIndex]: isCorrect }));
    setShowResult(true);
    
    // Update correct answer count immediately if correct
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:789',message:'AFTER immediate state updates',data:{isCorrect,currentQuestionIndex,showResult:true},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Calculate time taken (capture before confidence prompt so timing is fair)
    const timeTaken = (Date.now() - questionStartTime) / 1000;

    // Get mastery data before recording attempt
    const recentCorrects = await getQuestionCorrectTimestamps(user.id, questionId);

    // Check if confidence tracking is enabled
    if (trackConfidence) {
      // Open confidence prompt and defer saving until student sets confidence
      // Note: Colors are already shown above, this just handles the confidence input
      setPendingAnswer({
        questionId,
        isCorrect,
        timeTaken,
        recentCorrects,
        selectedAnswer: selectedAnswer || "",
      });
      setPendingConfidence(null);
      setShowConfidencePrompt(true);
    } else {
      // Skip confidence prompt and save with null confidence
      const currentQuestion = questions[currentQuestionIndex];
      const stimulusMeta = currentQuestion?.stimulusMeta || null;

      // Play sound effect
      if (isCorrect) {
        playCorrectSound();
      } else {
        playIncorrectSound();
      }

      // Async operations happen in background - colors are already shown above
      const attemptNumber = await recordQuestionAttempt(
        user.id,
        questionId,
        isCorrect,
        timeTaken,
        selectedAnswer || "",
        null, // No confidence when tracking is disabled
        new Date().toISOString(),
        stimulusMeta
      );

      const scoringResult = calculateQuestionPoints(isCorrect, attemptNumber, timeTaken, recentCorrects);
      
      // Update session tracking
      setSessionPointsEarned(prev => prev + scoringResult.finalQuestionPoints);
      if (isCorrect) {
        setSessionCorrectAnswers(prev => prev + 1);
      }
      setSessionTotalAnswered(prev => prev + 1);
      setLastScoringResult(scoringResult);

      // Update leaderboard score if points were earned (async, doesn't affect UI colors)
      if (isCorrect && scoringResult.finalQuestionPoints > 0) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:813',message:'Before updateScore call',data:{userId:user.id,pointsToAdd:scoringResult.finalQuestionPoints,activeQuizClass,currentClassScores:user.classScores,currentTotalScore:getTotalScore(user)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        await updateScore(user.id, scoringResult.finalQuestionPoints, activeQuizClass);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:815',message:'After updateScore, before refreshUser',data:{userId:user.id,pointsAdded:scoringResult.finalQuestionPoints,activeQuizClass},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // Refresh user state to update header total points
        await refreshUser();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:817',message:'After refreshUser',data:{userId:user.id,userClassScores:user.classScores,userTotalScore:getTotalScore(user)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        // Refresh leaderboard after score update
        if (activeQuizClass === currentLeaderboardClass && showLeaderboard) {
          getLeaderboard(activeQuizClass)
            .then((leaderboard) => {
              setGlobalLeaderboardData(leaderboard);
            })
            .catch((error) => {
              console.error('Failed to refresh leaderboard:', error);
            });
        }
      }
    }
  };

  const finalizeAnswer = async (confidenceValue: number) => {
    if (!pendingAnswer) return;
    const { questionId, isCorrect, timeTaken, recentCorrects, selectedAnswer } = pendingAnswer;

    // Play sound effect after confidence is provided
    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }

    // Get current question to check for stimulus
    const currentQuestion = questions[currentQuestionIndex];
    const stimulusMeta = currentQuestion?.stimulusMeta || null;

    const attemptNumber = await recordQuestionAttempt(
      user.id,
      questionId,
      isCorrect,
      timeTaken,
      selectedAnswer,
      confidenceValue,
      new Date().toISOString(),
      stimulusMeta
    );

    const scoringResult = calculateQuestionPoints(isCorrect, attemptNumber, timeTaken, recentCorrects);
    setLastScoringResult(scoringResult);

    setSessionTotalAnswered(prev => prev + 1);

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setSessionCorrectAnswers(prev => prev + 1);

        if (scoringResult.finalQuestionPoints > 0) {
          setSessionPointsEarned(prev => prev + scoringResult.finalQuestionPoints);
        
        // Update leaderboard score immediately after earning points
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:876',message:'Before updateScore call (confidence)',data:{userId:user.id,pointsToAdd:scoringResult.finalQuestionPoints,activeQuizClass,currentClassScores:user.classScores,currentTotalScore:getTotalScore(user)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        await updateScore(user.id, scoringResult.finalQuestionPoints, activeQuizClass);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:878',message:'After updateScore, before refreshUser (confidence)',data:{userId:user.id,pointsAdded:scoringResult.finalQuestionPoints,activeQuizClass},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // Refresh user state to update header total points
        await refreshUser();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:880',message:'After refreshUser (confidence)',data:{userId:user.id,userClassScores:user.classScores,userTotalScore:getTotalScore(user)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        // Refresh leaderboard after score update
        if (activeQuizClass === currentLeaderboardClass && showLeaderboard) {
          getLeaderboard(activeQuizClass)
            .then((leaderboard) => {
              setGlobalLeaderboardData(leaderboard);
            })
            .catch((error) => {
              console.error('Failed to refresh leaderboard:', error);
            });
        }
      }

      if (scoringResult.finalQuestionPoints > 0) {
        const breakdown = formatPointsBreakdown(scoringResult);
        toast.success(`+${scoringResult.finalQuestionPoints} pts! (${breakdown})`);
      } else if (attemptNumber > 2) {
        toast.success("Correct! (No points - 3rd+ attempt)");
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:944',message:'finalizeAnswer - BEFORE setQuestionResults and setShowResult',data:{isCorrect,currentQuestionIndex,selectedAnswer:selectedAnswer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    setQuestionResults(prev => {
      const newResults = { ...prev, [currentQuestionIndex]: isCorrect };
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:944',message:'finalizeAnswer - INSIDE setQuestionResults updater',data:{currentQuestionIndex,isCorrect,newResultValue:newResults[currentQuestionIndex]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return newResults;
    });

    if (!answeredQuestions.includes(currentQuestionIndex)) {
      setAnsweredQuestions(prev => [...prev, currentQuestionIndex]);
    }

    setShowResult(true);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:950',message:'finalizeAnswer - AFTER setShowResult(true)',data:{isCorrect,currentQuestionIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    setShowConfidencePrompt(false);
    setPendingAnswer(null);
    setPendingConfidence(null);
  };


  const nextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      const newIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newIndex);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionStartTime(Date.now()); // Reset timer for next question
      setElapsedTime(0);
      
      // Save progress after each question
      await saveQuizProgress(user.id, {
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
      
      // Apply final session points to leaderboard (scores already updated after each question)
      if (sessionResult.finalSessionPoints > 0) {
        addDailyPoints(user.id, sessionResult.finalSessionPoints);
        // Note: Score was already updated incrementally after each question, so we don't need to update again here
      }
      
      await clearQuizProgress(user.id, activeQuizClass, selectedUnit);
      
      // Save quiz result - backend will update class scores and streak automatically
      await saveQuizResult({
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
      
      // Apply earned points immediately (if exiting mid-quiz, points already updated after each question)
      if (sessionResult.finalSessionPoints > 0) {
        addDailyPoints(user.id, sessionResult.finalSessionPoints);
        // Note: Scores are already updated after each question, so no need to update again here
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


  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-gold" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-silver" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-bronze" />;
    return <span className="text-xs font-bold text-muted-foreground">#{rank}</span>;
  };

  const getBestRank = async (): Promise<string> => {
    const ranks = await Promise.all(
      userClasses.map(c => getLeaderboard(c).then((lb: User[]) => {
        const rank = lb.findIndex(u => u.id === user.id) + 1;
        return rank > 0 ? rank : Infinity;
      }))
    );
    const bestRank = Math.min(...ranks);
    return bestRank !== Infinity ? `#${bestRank}` : '-';
  };

  // AP Test handlers
  const handleStartAPTest = (testData: APTestData) => {
    setApTestData(testData);
    setApTestStartTime(Date.now());
    setIsAPTestActive(true);
    setShowAPTestResults(false);
  };

  const handleAPTestComplete = (responses: APTestQuestionResponse[]) => {
    if (!apTestData) return;

    const endTime = Date.now();
    const totalTimeUsed = (endTime - apTestStartTime) / 1000;
    const summary = calculateAPTestSummary(responses, apTestStartTime, endTime);

    const attempt: APTestAttempt = {
      id: generateAPTestAttemptId(),
      userId: user.id,
      apClass: apTestData.ap_class,
      testId: apTestData.test_id,
      startTimestamp: new Date(apTestStartTime).toISOString(),
      endTimestamp: new Date(endTime).toISOString(),
      totalTimeUsedSeconds: totalTimeUsed,
      responses,
      summary,
    };

    saveAPTestAttempt(attempt);
    setApTestAttempt(attempt);
    setIsAPTestActive(false);
    setShowAPTestResults(true);
  };

  const handleAPTestExit = () => {
    setIsAPTestActive(false);
    setApTestData(null);
    setShowAPTestResults(false);
    setApTestAttempt(null);
  };

  const handleViewAPTestAnalytics = () => {
    setActiveTab("analytics");
    setShowAPTestResults(false);
    setApTestAttempt(null);
  };

  // AP Test Active View
  if (isAPTestActive && apTestData) {
    return (
      <APTestInterface
        testData={apTestData}
        onComplete={handleAPTestComplete}
        onExit={handleAPTestExit}
      />
    );
  }

  // AP Test Results View
  if (showAPTestResults && apTestAttempt) {
    return (
      <APTestResults
        attempt={apTestAttempt}
        testData={apTestData}
        onViewAnalytics={handleViewAPTestAnalytics}
        onRetake={() => {
          if (apTestData) {
            handleStartAPTest(apTestData);
          }
        }}
      />
    );
  }

  // Update current question attempts when question changes
  useEffect(() => {
    if (isQuizActive && !quizComplete && questions.length > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      const questionId = currentQuestion?.id || `${activeQuizClass}:${selectedUnit}:${currentQuestionIndex}`;
      getQuestionAttempts(user.id, questionId).then(setCurrentQuestionAttempts);
    }
  }, [isQuizActive, quizComplete, currentQuestionIndex, questions, activeQuizClass, selectedUnit, user.id]);

  // Quiz Active View
  if (isQuizActive && !quizComplete) {
    const currentQuestion = questions[currentQuestionIndex];
    const questionId = currentQuestion?.id || `${activeQuizClass}:${selectedUnit}:${currentQuestionIndex}`;
    
    // Log the current question being displayed to verify it's from JSON
    if (currentQuestion) {
      console.log(`[StudentDashboard] Displaying question ${currentQuestionIndex + 1}/${questions.length}:`, {
        id: currentQuestion.id,
        questionText: currentQuestion.questionText.substring(0, 100) + '...',
        hasStimulus: !!currentQuestion.stimulus,
        stimulusLength: currentQuestion.stimulus?.length || 0,
        stimulusTypes: currentQuestion.stimulus?.map(s => s.type) || [],
        stimulusMeta: currentQuestion.stimulusMeta,
        optionsCount: currentQuestion.options.length,
        correctAnswerId: currentQuestion.correctAnswerId
      });
    }
    
    return (
      <div className="min-h-screen bg-background">
        <style>{`
          .quiz-speed-bonus-text {
            font-size: 1.16375rem;
          }
          @media (min-width: 768px) {
            .quiz-speed-bonus-text {
              font-size: 1.33rem;
            }
          }
          .quiz-answer-choice-text {
            font-size: 1.49625rem;
          }
          @media (min-width: 768px) {
            .quiz-answer-choice-text {
              font-size: 1.6625rem;
            }
          }
        `}</style>
        <header className="gradient-secondary text-secondary-foreground py-4">
          <div className="container mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-7 h-7" />
              <div>
                <span className="font-bold text-xl md:text-2xl">{activeQuizClass}</span>
                <span className="mx-2 opacity-50 text-lg md:text-xl">•</span>
                <span className="opacity-80 text-lg md:text-xl">{selectedUnit}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-base md:text-lg opacity-80 font-semibold">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <Button
                variant="default"
                size="lg"
                onClick={exitQuiz}
                className="bg-secondary-foreground text-black hover:bg-secondary-foreground/90 font-semibold text-lg px-6 py-3 rounded-full shadow-lg"
                disabled={showConfidencePrompt}
              >
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

        <main className="container mx-auto px-4 md:px-6 py-6 max-w-[95vw]">
            {/* Stimulus Section - Above Question Card */}
            {currentQuestion?.stimulus && Array.isArray(currentQuestion.stimulus) && currentQuestion.stimulus.length > 0 && (
              <Card variant="elevated" className="mb-6 border-2 border-secondary/20 bg-secondary/5">
                <CardContent className="pt-6">
                  <div className="mb-4">
                    <h3 className="font-bold text-secondary" style={{ fontSize: '1.6625rem' }}>Stimulus</h3>
                    <p className="text-muted-foreground" style={{ fontSize: '1.16375rem' }}>Review the information below before answering the question.</p>
                  </div>
                  <StimulusRenderer stimulus={currentQuestion.stimulus} />
                </CardContent>
              </Card>
            )}
            
            <Card
              variant="elevated"
              className="animate-fade-in min-h-[80vh] shadow-xl border-2 w-full"
              style={{ overflow: "visible", height: "auto" }}
            >
            <CardHeader className="pb-6 px-8 pt-8">
              <div className="flex items-center justify-between mb-2">
                  <CardTitle
                    className="text-2xl md:text-3xl lg:text-4xl leading-[1.5] text-left w-full"
                    style={{ overflow: "visible", wordBreak: "break-word", whiteSpace: "normal" }}
                  >
                    <div className="w-full max-w-none">
                      <MathText text={currentQuestion.questionText} />
                    </div>
                  </CardTitle>
              </div>
              {currentQuestionAttempts > 0 && (
                <p className="text-muted-foreground" style={{ fontSize: '1.16375rem' }}>
                  {currentQuestionAttempts === 1 ? "1 previous attempt (next correct = half points)" : 
                   currentQuestionAttempts >= 2 ? `${currentQuestionAttempts} attempts (no points available)` : ""}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-6 px-8 pb-8">
              {/* Timer Bar */}
              {!showResult && (
                <div className="space-y-2">
                  <div className="flex justify-between text-muted-foreground quiz-speed-bonus-text">
                    <span>Speed Bonus</span>
                    <span>{Math.max(0, Math.round(TIMER_DURATION - elapsedTime))}s</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
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
                const normalizedOptionId = String(option.id).trim();
                const normalizedSelected = selectedAnswer ? String(selectedAnswer).trim() : null;
                // Fix: Use same fallback logic as in submitAnswer
                const correctAnswerId = currentQuestion.correctAnswerId || 
                                      (currentQuestion as any).correctOptionId || 
                                      (currentQuestion as any).correct_answer_id || 
                                      '';
                const normalizedCorrect = String(correctAnswerId).trim();
                const isSelected = normalizedSelected === normalizedOptionId;
                const isCorrectOption = normalizedOptionId === normalizedCorrect;
                const showCorrect = showResult && isCorrectOption;
                const showWrong = showResult && isSelected && !isCorrectOption;
                
                // #region agent log
                if (showResult) {
                  fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:1362',message:'Answer option render with showResult=true',data:{optionId:option.id,normalizedOptionId,normalizedSelected,normalizedCorrect,isSelected,isCorrectOption,showCorrect,showWrong,showResult,questionResultsValue:questionResults[currentQuestionIndex]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                }
                // #endregion

                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(option.id)}
                    disabled={showResult}
                    className={`w-full p-6 rounded-2xl border-2 text-left transition-all duration-200 flex items-start gap-5
                      ${showCorrect ? 'border-success bg-success/10' : showWrong ? 'border-destructive bg-destructive/10' : isSelected && !showResult ? 'border-secondary bg-secondary/15 shadow-md ring-2 ring-secondary/20' : 'border-border bg-card'}
                      ${!showResult ? 'hover:border-secondary hover:bg-secondary/5 hover:shadow-sm' : ''}
                    `}
                    style={{ minHeight: 'auto', height: 'auto' }}
                    >
                    <span className={`w-14 h-14 rounded-xl flex items-center justify-center font-extrabold text-xl flex-shrink-0 transition-all
                      ${showCorrect ? 'bg-success text-success-foreground' : showWrong ? 'bg-destructive text-destructive-foreground' : isSelected && !showResult ? 'bg-secondary text-secondary-foreground shadow-lg scale-110' : 'bg-muted text-muted-foreground'}
                    `}>
                      {option.id}
                    </span>
                    <div
                      className="flex-1 font-medium whitespace-pre-wrap leading-relaxed pt-1 quiz-answer-choice-text"
                      style={{ overflow: "visible", wordBreak: "break-word", whiteSpace: "normal", height: "auto" }}
                    >
                      <MathText text={option.content} />
                    </div>
                    {showCorrect && <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />}
                    {showWrong && <XCircle className="w-6 h-6 text-destructive flex-shrink-0" />}
                  </button>
                );
              })}

              {showResult && (
                <div className="mt-6 p-6 rounded-xl border-2 bg-muted/40 space-y-3">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    {questionResults[currentQuestionIndex] ? (
                      <span className="text-success">Correct</span>
                    ) : (
                      <span className="text-destructive">Incorrect</span>
                    )}
                  </div>
                  {!questionResults[currentQuestionIndex] && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="text-sm font-semibold text-destructive mb-2">Correct Answer:</div>
                      {(() => {
                        // Fix: Use same fallback logic to get correctAnswerId
                        const correctAnswerId = currentQuestion.correctAnswerId || 
                                              (currentQuestion as any).correctOptionId || 
                                              (currentQuestion as any).correct_answer_id || 
                                              '';
                        const normalizedCorrectId = String(correctAnswerId).trim();
                        const correctOption = currentQuestion.options.find(
                          opt => String(opt.id).trim() === normalizedCorrectId
                        );
                        return correctOption ? (
                          <div className="flex items-start gap-3">
                            <span className="w-10 h-10 rounded-lg bg-success text-success-foreground flex items-center justify-center font-bold flex-shrink-0">
                              {correctOption.id}
                            </span>
                            <div className="flex-1 text-base">
                              <MathText text={correctOption.content} />
                            </div>
                          </div>
                        ) : (
                          <div className="text-base text-muted-foreground">
                            Option {correctAnswerId || 'Unknown'}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {currentQuestion.explanation && (
                    <div className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      <MathText text={currentQuestion.explanation} />
                    </div>
                  )}
                </div>
              )}

              <div className="pt-6">
                {!showResult ? (
              <Button variant="student" size="lg" className="w-full font-bold" style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem', fontSize: '1.75rem' }} onClick={submitAnswer} disabled={!selectedAnswer || showConfidencePrompt}>
                    Submit Answer
                  </Button>
                ) : (
                  <Button variant="student" size="lg" className="w-full py-6 text-xl font-bold" onClick={nextQuestion}>
                    {currentQuestionIndex < questions.length - 1 ? (
                      <>Next Question <ArrowRight className="w-6 h-6 ml-2" /></>
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
              setConfidenceSliderValue([3]); // Reset to middle
            }
          }}
        >
          <DialogContent className="w-[50vw] h-[50vh] max-w-none max-h-none">
            <DialogHeader>
              <DialogTitle className="text-4xl">How confident are you in this answer?</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-2xl">
                  <span className="text-muted-foreground">Not sure</span>
                  <span className="font-semibold text-4xl">{confidenceSliderValue[0]}</span>
                  <span className="text-muted-foreground">Very sure</span>
                </div>
                <Slider
                  value={confidenceSliderValue}
                  onValueChange={setConfidenceSliderValue}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full scale-y-150"
                />
                <div className="flex justify-between text-xl text-muted-foreground px-1">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
                <div className="text-center text-2xl font-medium pt-2">
                  {confidenceSliderValue[0] === 1 && "Not sure"}
                  {confidenceSliderValue[0] === 2 && "A little unsure"}
                  {confidenceSliderValue[0] === 3 && "Somewhat sure"}
                  {confidenceSliderValue[0] === 4 && "Pretty sure"}
                  {confidenceSliderValue[0] === 5 && "Very sure"}
                </div>
              </div>
              <Button 
                variant="student" 
                size="lg" 
                className="w-full text-2xl py-8" 
                onClick={() => finalizeAnswer(confidenceSliderValue[0])}
              >
                Submit Answer
              </Button>
              <p className="text-lg text-muted-foreground text-center">
                Adjust the slider to indicate your confidence level.
              </p>
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="disable-confidence" className="text-3xl font-medium">
                    Don't ask for confidence
                  </Label>
                  <p className="text-2xl text-muted-foreground">
                    Disable confidence tracking for future questions
                  </p>
                </div>
                <Switch
                  id="disable-confidence"
                  checked={!trackConfidence}
                  className="scale-150 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-400"
                  onCheckedChange={(checked) => {
                    const newValue = !checked;
                    setTrackConfidence(newValue);
                    autoSaveSettings(
                      { trackConfidence: newValue },
                      {
                        firstName: editFirstName,
                        lastName: editLastName,
                        displayPreference: editDisplayPreference,
                        showLeaderboard: showLeaderboard,
                        showRank: showRank,
                        showRankPublicly: showRankPublicly,
                        trackConfidence: newValue
                      }
                    );
                  }}
                />
              </div>
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
        <div className="w-full py-5">
          <div className="flex items-center w-full">
            {/* Username - Anchored near left with moderate padding */}
            <div className="flex items-center gap-6 flex-shrink-0 pl-4 md:pl-6 lg:pl-8 pr-10 lg:pr-12 xl:pr-16">
              <div className="w-14 h-14 rounded-xl bg-secondary-foreground/20 flex items-center justify-center">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <h1 className="font-bold text-2xl md:text-3xl whitespace-nowrap">{getDisplayName(user)}</h1>
              </div>
            </div>
            
            {/* Quick Stats in Header - Centered with balanced spacing */}
            <div className="hidden sm:flex items-center gap-10 lg:gap-14 xl:gap-20 flex-1 justify-center min-w-0">
              <div className="flex items-center gap-3 whitespace-nowrap">
                <Star className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0" />
                <span className="font-bold text-xl md:text-2xl lg:text-3xl">{
                  // #region agent log
                  (() => {
                    const totalScore = getTotalScore(user) ?? 0;
                    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:1581',message:'Heading getTotalScore call',data:{totalScore,userId:user?.id,classScores:user?.classScores,classScoresKeys:user?.classScores ? Object.keys(user.classScores) : [],classScoresValues:user?.classScores ? Object.values(user.classScores) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    return totalScore;
                  })()
                  // #endregion
                } <span className="text-lg md:text-xl lg:text-2xl">pts</span></span>
              </div>
              <div className="flex items-center gap-3 whitespace-nowrap">
                <Flame className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0" />
                <span className="font-bold text-xl md:text-2xl lg:text-3xl">{user.streak} <span className="text-lg md:text-xl lg:text-2xl">day</span></span>
              </div>
              {showRank && (
              <div className="flex items-center gap-3 whitespace-nowrap">
                <Trophy className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0" />
                <span className="font-bold text-xl md:text-2xl lg:text-3xl">{bestRankDisplay}</span>
                </div>
              )}
              {/* Rank Toggle - Trophy and toggle closer together */}
              <div className="flex items-center gap-2 px-5 py-3 rounded-lg bg-secondary-foreground/10 whitespace-nowrap">
                <Trophy className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0" />
                  <Switch
                    checked={showRank}
                    onCheckedChange={(checked) => {
                      setShowRank(checked);
                      updateProfile({ showRank: checked });
                      // Don't call refreshUser() - updateProfile already updates the user state
                    }}
                    className="scale-110 flex-shrink-0 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-400"
                  />
                <span className="text-lg md:text-xl font-bold">Rank</span>
              </div>
            </div>
            
            {/* Logout Button - Anchored near right with moderate padding */}
            <Button
              variant="ghost"
              size="lg"
              onClick={handleLogout}
              className="text-secondary-foreground hover:bg-secondary-foreground/10 h-14 text-xl md:text-2xl font-bold px-6 flex-shrink-0 whitespace-nowrap ml-10 lg:ml-12 xl:ml-16 pr-12 md:pr-14 lg:pr-16"
            >
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
          
          {/* Mobile Stats */}
          <div className="flex sm:hidden items-center justify-center gap-6 mt-4 pt-4 border-t border-secondary-foreground/20">
            <div className="flex items-center gap-3 text-lg">
              <Star className="w-6 h-6" />
              <span className="font-bold">{getTotalScore(user) ?? 0}</span>
            </div>
            <div className="flex items-center gap-3 text-lg">
              <Flame className="w-6 h-6" />
              <span className="font-bold">{user.streak}</span>
            </div>
            {showRank && (
            <div className="flex items-center gap-3 text-lg">
              <Trophy className="w-6 h-6" />
              <span className="font-bold">{bestRankDisplay}</span>
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
                  // Don't call refreshUser() - updateProfile already updates the user state
                }}
                className="scale-100 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-400"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-4 px-2 max-w-[98vw]">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
        }} className="space-y-4">
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
                    <label className="text-2xl md:text-3xl font-bold text-foreground">Class</label>
                    <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedUnit(""); }}>
                      <SelectTrigger className="h-20 text-3xl">
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {userClasses.map((className) => (
                          <SelectItem key={className} value={className} className="text-3xl">
                            {className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-2xl md:text-3xl font-bold text-foreground">Unit</label>
                    <Select value={selectedUnit} onValueChange={setSelectedUnit} disabled={!selectedClass}>
                      <SelectTrigger className="h-20 text-3xl">
                        <SelectValue placeholder={selectedClass ? "Select a unit" : "Select class first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          // #region agent log
                          fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentDashboard.tsx:1749',message:'Rendering unit dropdown',data:{selectedClass,unitsCount:units.length,units,selectedUnit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                          // #endregion
                          return units.map((unit) => {
                            const progress = unitProgress[unit];
                            const total = unitQuestionCounts[unit];
                            const answered = progress ? progress.answeredQuestions.length : 0;
                            return (
                              <SelectItem key={unit} value={unit} className="text-3xl">
                                {unit}{" "}
                                {total !== undefined
                                  ? `(Questions answered: ${answered}/${total})`
                                  : progress
                                    ? `(Questions answered: ${answered}/?)`
                                    : ""}
                              </SelectItem>
                            );
                          });
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="relative min-h-[5rem]">
                  <div 
                    key={`quiz-btn-${selectedClass}-${selectedUnit}-${currentUnitProgress ? 'has-progress' : 'no-progress'}`}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    {selectedClass && selectedUnit && (() => {
                      const progress = currentUnitProgress;
                      return progress ? (
                        <div className="flex gap-4">
                          <Button 
                            variant="outline" 
                            size="lg" 
                            className="flex-1 h-20 text-xl font-bold transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
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
                            className="flex-1 h-20 text-2xl font-bold transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
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
                          className="w-full h-20 text-2xl font-bold transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
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
                        className="w-full h-20 text-2xl font-bold transition-all duration-200 ease-out"
                        disabled
                      >
                        <Play className="w-7 h-7 mr-2" />
                        Start Quiz
                      </Button>
                    )}
                  </div>
                </div>
                
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

            {/* AP Test Section */}
            <APTestSection
              userClasses={userClasses}
              onStartTest={handleStartAPTest}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4 animate-fade-in">
            {user && userClasses.length > 0 ? (
              <AnalyticsDashboard key={`analytics-${user.id}`} userId={user.id} classNames={userClasses} />
            ) : (
              <div className="p-4 text-center text-muted-foreground">Loading analytics...</div>
            )}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4 animate-fade-in">
            {!showLeaderboard ? (
              <Card variant="elevated">
                <CardContent className="py-12 text-center px-8">
                  <EyeOff className="w-24 h-24 mx-auto mb-5 text-muted-foreground opacity-50" />
                  <CardTitle className="mb-4 text-[37.5px] md:text-[50px] lg:text-[62.5px] font-bold">Leaderboard is Hidden</CardTitle>
                  <CardDescription className="mb-6 text-[25px] md:text-[30px]">
                    Enable the leaderboard in Settings to view rankings and compare your progress with others.
                  </CardDescription>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="h-16 text-[25px] font-bold"
                    onClick={() => setActiveTab("settings")}
                  >
                    Go to Settings
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
            {/* Leaderboard Settings Toggles */}
            <Card variant="elevated" className="mb-6">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-[25px] md:text-[30px] font-bold">Leaderboard Settings</CardTitle>
                <CardDescription className="text-[20px] md:text-[25px]">Customize your leaderboard experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-1">
                    <Label htmlFor="leaderboard-show-leaderboard" className="text-[22.5px] md:text-[25px] font-bold">
                      Show Leaderboard
                    </Label>
                    <p className="text-[17.5px] md:text-[20px] text-muted-foreground">
                      {showLeaderboard 
                        ? "Leaderboard tab is visible" 
                        : "Leaderboard tab is hidden"}
                    </p>
                  </div>
                  <Switch
                    id="leaderboard-show-leaderboard"
                    checked={showLeaderboard}
                    onCheckedChange={(checked) => {
                      setShowLeaderboard(checked);
                      autoSaveSettings(
                        { showLeaderboard: checked },
                        {
                          firstName: editFirstName,
                          lastName: editLastName,
                          displayPreference: editDisplayPreference,
                          showLeaderboard: checked,
                          showRank: showRank,
                          showRankPublicly: showRankPublicly,
                          trackConfidence: trackConfidence
                        }
                      );
                    }}
                    className="scale-110"
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-1">
                    <Label htmlFor="leaderboard-show-rank" className="text-[22.5px] md:text-[25px] font-bold">
                      Display Place for User
                    </Label>
                    <p className="text-[17.5px] md:text-[20px] text-muted-foreground">
                      {showRank 
                        ? "Your rank/place is visible to you" 
                        : "Your rank/place is hidden from you"}
                    </p>
                  </div>
                  <Switch
                    id="leaderboard-show-rank"
                    checked={showRank}
                    onCheckedChange={(checked) => {
                      setShowRank(checked);
                      autoSaveSettings(
                        { showRank: checked },
                        {
                          firstName: editFirstName,
                          lastName: editLastName,
                          displayPreference: editDisplayPreference,
                          showLeaderboard: showLeaderboard,
                          showRank: checked,
                          showRankPublicly: showRankPublicly,
                          trackConfidence: trackConfidence
                        }
                      );
                    }}
                    className="scale-110"
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-1">
                    <Label htmlFor="leaderboard-show-rank-publicly" className="text-[22.5px] md:text-[25px] font-bold">
                      Display Rank on Leaderboard Publicly
                    </Label>
                    <p className="text-[17.5px] md:text-[20px] text-muted-foreground">
                      {showRankPublicly 
                        ? "Others can see your rank on leaderboards" 
                        : "Others cannot see your rank on leaderboards"}
                    </p>
                  </div>
                  <Switch
                    id="leaderboard-show-rank-publicly"
                    checked={showRankPublicly}
                    onCheckedChange={(checked) => {
                      setShowRankPublicly(checked);
                      autoSaveSettings(
                        { showRankPublicly: checked },
                        {
                          firstName: editFirstName,
                          lastName: editLastName,
                          displayPreference: editDisplayPreference,
                          showLeaderboard: showLeaderboard,
                          showRank: showRank,
                          showRankPublicly: checked,
                          trackConfidence: trackConfidence
                        }
                      );
                    }}
                    className="scale-110"
                  />
                </div>
              </CardContent>
            </Card>

            {userClasses.length > 1 && (
              <Select value={currentLeaderboardClass} onValueChange={setLeaderboardClass}>
                <SelectTrigger className="w-full h-16 text-[22.5px]">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {userClasses.map((className) => (
                    <SelectItem key={className} value={className} className="text-[22.5px]">
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {currentLeaderboardClass && (() => {
                  // Global leaderboard (all students in this AP class)
                  // Filter out users with showRankPublicly = false (except current user)
                  const globalLeaderboard = globalLeaderboardData.filter(u => 
                    u.id === user.id || u.showRankPublicly !== false
                  );
                  const globalUserRank = globalLeaderboard.findIndex(u => u.id === user.id) + 1;
                  
                  // Class leaderboard (only students who joined via the same class code)
                  const classCode = getClassCodeForStudent(user.id, currentLeaderboardClass);
                  const classLeaderboardEnabled = classCode ? isClassLeaderboardEnabled(classCode) : false;
                  const classStudents = classCode ? getStudentsInSameClass(user.id, currentLeaderboardClass) : [];
                  // Filter out users with showRankPublicly = false (except current user)
                  const classLeaderboard = classStudents
                    .filter(s => s.apClasses.includes(currentLeaderboardClass))
                    .filter(s => s.id === user.id || s.showRankPublicly !== false)
                    .sort((a, b) => (getClassScore(b, currentLeaderboardClass) || 0) - (getClassScore(a, currentLeaderboardClass) || 0));
                  const classUserRank = classLeaderboard.findIndex(u => u.id === user.id) + 1;

              return (
                    <div className="space-y-6">
                      {/* Class Leaderboard (if student joined via class code and teacher enabled it) */}
                      {classCode && classLeaderboard.length > 0 && classLeaderboardEnabled && (
                <Card variant="elevated">
                  <CardHeader className="pb-5 px-8 pt-8">
                    <div className="flex items-center justify-between">
                          <CardTitle className="text-[30px] md:text-[37.5px] font-bold">Class Leaderboard - {currentLeaderboardClass}</CardTitle>
                          {classUserRank > 0 && showRank && (
                            <span className="text-[20px] md:text-[22.5px] text-muted-foreground">Your rank: <strong className="text-secondary">#{classUserRank}</strong></span>
                      )}
                    </div>
                        <CardDescription className="text-[22.5px] md:text-[25px] mt-2">Students in your class only</CardDescription>
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
                                {(student.showRankPublicly !== false) && (
                            <div className="w-10 flex justify-center text-[25px]">{getRankIcon(rank)}</div>
                                )}
                                {(student.showRankPublicly === false) && <div className="w-10" />}
                                <span className={`flex-1 font-semibold text-[22.5px] text-left ${isCurrentUser ? 'text-secondary' : ''}`}>
                                  {getDisplayName(student)}
                                  {isCurrentUser && <span className="text-[17.5px] ml-2 opacity-70">(You)</span>}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Star className="w-5 h-5 text-gold" />
                                  <span className="font-bold text-[22.5px]">{getClassScore(student, currentLeaderboardClass)}</span>
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
                        <CardTitle className="text-[30px] md:text-[37.5px] font-bold">Global Leaderboard - {currentLeaderboardClass}</CardTitle>
                        {globalUserRank > 0 && showRank && (
                          <span className="text-[20px] md:text-[22.5px] text-muted-foreground">Your rank: <strong className="text-secondary">#{globalUserRank}</strong></span>
                        )}
                      </div>
                      <CardDescription className="text-[22.5px] md:text-[25px] mt-2">All students in {currentLeaderboardClass}</CardDescription>
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
                              {(student.showRankPublicly !== false) && (
                                <div className="w-10 flex justify-center text-[25px]">{getRankIcon(rank)}</div>
                              )}
                              {(student.showRankPublicly === false) && <div className="w-10" />}
                            <span className={`flex-1 font-semibold text-[22.5px] text-left ${isCurrentUser ? 'text-secondary' : ''}`}>
                              {getDisplayName(student)}
                              {isCurrentUser && <span className="text-[17.5px] ml-2 opacity-70">(You)</span>}
                            </span>
                            <div className="flex items-center gap-2">
                              <Star className="w-5 h-5 text-gold" />
                              <span className="font-bold text-[22.5px]">{getClassScore(student, currentLeaderboardClass)}</span>
                            </div>
                          </button>
                        );
                      }) : (
                        <p className="text-center text-[22.5px] text-muted-foreground py-12">
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
                  const studentHistory = studentHistoryData;
                  const totalQuizzes = studentHistory.length;
                  const avgAccuracy = totalQuizzes > 0 
                    ? Math.round(studentHistory.reduce((sum, q) => sum + (q.score / q.totalQuestions) * 100, 0) / totalQuizzes)
                    : 0;
                  
                  // Determine if this student is in top 3 for the current class
                  const globalLeaderboard = currentLeaderboardClass ? globalLeaderboardData : [];
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
                          <Label htmlFor="profile-rank-toggle" className="text-[17.5px] font-medium">
                            Show Rank
                          </Label>
                        </div>
                        <Switch
                          id="profile-rank-toggle"
                          checked={profileViewShowRank}
                          onCheckedChange={setProfileViewShowRank}
                          className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-400"
                        />
                      </div>
                      
                      <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-3">
                          {profileViewShowRank && studentRank > 0 && currentLeaderboardClass && (
                            <div className="p-3 rounded-xl bg-muted text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Trophy className="w-4 h-4 text-gold" />
                              </div>
                              <div className="text-[30px] font-bold">#{studentRank}</div>
                              <div className="text-[15px] text-muted-foreground">Global Rank</div>
                            </div>
                          )}
                          <div className="p-3 rounded-xl bg-muted text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Star className="w-4 h-4 text-gold" />
                            </div>
                            <div className="text-[30px] font-bold">{getTotalScore(viewingStudent) ?? 0}</div>
                            <div className="text-[15px] text-muted-foreground">Total Points</div>
                          </div>
                          <div className="p-3 rounded-xl bg-muted text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Flame className="w-4 h-4 text-orange-500" />
                            </div>
                            <div className="text-[30px] font-bold">{viewingStudent.streak}</div>
                            <div className="text-[15px] text-muted-foreground">Day Streak</div>
                          </div>
                          <div className="p-3 rounded-xl bg-muted text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <BookOpen className="w-4 h-4 text-secondary" />
                            </div>
                            <div className="text-[30px] font-bold">{totalQuizzes}</div>
                            <div className="text-[15px] text-muted-foreground">Quizzes Taken</div>
                          </div>
                          <div className="p-3 rounded-xl bg-muted text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <CheckCircle className="w-4 h-4 text-success" />
                            </div>
                            <div className="text-[30px] font-bold">{avgAccuracy}%</div>
                            <div className="text-[15px] text-muted-foreground">Avg Accuracy</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[17.5px] font-medium text-muted-foreground mb-2">AP Classes</h4>
                          <div className="flex flex-wrap gap-2">
                            {(viewingStudent.apClasses || []).map((c) => (
                              <span key={c} className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[17.5px] font-medium">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        {studentHistory.length > 0 && (
                          <div>
                            <h4 className="text-[17.5px] font-medium text-muted-foreground mb-2">Recent Activity</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {studentHistory.slice(0, 5).map((quiz, i) => (
                                <div key={i} className="flex items-center justify-between text-[17.5px] p-2 rounded-lg bg-muted/50">
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
                      try {
                        const result = await joinClassByCode(user.id, classCodeInput.trim());
                        
                        if (result.success) {
                          toast.success(`Successfully joined ${result.class?.apClassName}!`);
                          setClassCodeInput("");
                          refreshUser();
                        } else {
                          toast.error(result.message);
                        }
                      } catch (error) {
                        toast.error("Failed to join class. Please try again.");
                      } finally {
                        setIsJoiningClass(false);
                      }
                    }}
                    disabled={isJoiningClass || !classCodeInput.trim()}
                  >
                    {isJoiningClass ? (
                      <PremiumLoader size="md" />
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
                      className="h-20 !text-[40px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName" className="text-xl md:text-2xl font-bold">Last Name</Label>
                    <Input
                      id="editLastName"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="h-20 !text-[40px]"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editNickname" className="text-xl md:text-2xl font-bold">Anonymous Nickname</Label>
                  <Input
                    id="editNickname"
                    value={editNickname}
                    disabled
                    className="bg-muted cursor-not-allowed h-20 !text-[40px]"
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
                    onCheckedChange={(checked) => {
                      setShowLeaderboard(checked);
                      autoSaveSettings(
                        { showLeaderboard: checked },
                        {
                          firstName: editFirstName,
                          lastName: editLastName,
                          displayPreference: editDisplayPreference,
                          showLeaderboard: checked,
                          showRank: showRank,
                          showRankPublicly: showRankPublicly,
                          trackConfidence: trackConfidence
                        }
                      );
                    }}
                    className="scale-125"
                  />
                </div>
                <div className="flex items-center justify-between p-5 rounded-lg border">
                  <div className="space-y-1">
                    <Label htmlFor="show-rank" className="text-xl md:text-2xl font-bold">
                      Display Place for User
                    </Label>
                    <p className="text-lg md:text-xl text-muted-foreground">
                      {showRank 
                        ? "Your rank/place is visible to you" 
                        : "Your rank/place is hidden from you"}
                    </p>
                  </div>
                  <Switch
                    id="show-rank"
                    checked={showRank}
                    onCheckedChange={(checked) => {
                      setShowRank(checked);
                      autoSaveSettings(
                        { showRank: checked },
                        {
                          firstName: editFirstName,
                          lastName: editLastName,
                          displayPreference: editDisplayPreference,
                          showLeaderboard: showLeaderboard,
                          showRank: checked,
                          showRankPublicly: showRankPublicly,
                          trackConfidence: trackConfidence
                        }
                      );
                    }}
                    className="scale-125 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-400"
                  />
                </div>
                <div className="flex items-center justify-between p-5 rounded-lg border">
                  <div className="space-y-1">
                    <Label htmlFor="show-rank-publicly" className="text-xl md:text-2xl font-bold">
                      Display Rank on Leaderboard Publicly
                    </Label>
                    <p className="text-lg md:text-xl text-muted-foreground">
                      {showRankPublicly 
                        ? "Others can see your rank on leaderboards" 
                        : "Others cannot see your rank on leaderboards"}
                    </p>
                  </div>
                  <Switch
                    id="show-rank-publicly"
                    checked={showRankPublicly}
                    onCheckedChange={(checked) => {
                      setShowRankPublicly(checked);
                      autoSaveSettings(
                        { showRankPublicly: checked },
                        {
                          firstName: editFirstName,
                          lastName: editLastName,
                          displayPreference: editDisplayPreference,
                          showLeaderboard: showLeaderboard,
                          showRank: showRank,
                          showRankPublicly: checked,
                          trackConfidence: trackConfidence
                        }
                      );
                    }}
                    className="scale-125 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-400"
                  />
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader className="pb-5 px-8 pt-6">
                <CardTitle className="flex items-center gap-4 text-3xl md:text-4xl lg:text-5xl font-bold">
                  <Settings className="w-8 h-8 md:w-9 md:h-9 text-secondary" />
                  Confidence Settings
                </CardTitle>
                <CardDescription className="text-xl md:text-2xl mt-3">Control confidence tracking preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-8 pb-6">
                <div className="flex items-center justify-between p-5 rounded-lg border">
                  <div className="space-y-1">
                    <Label htmlFor="track-confidence" className="text-xl md:text-2xl font-bold">
                      Track Confidence
                    </Label>
                    <p className="text-lg md:text-xl text-muted-foreground">
                      {trackConfidence 
                        ? "You'll be asked to rate your confidence after each answer" 
                        : "Confidence tracking is disabled - answers will be saved immediately"}
                    </p>
                  </div>
                  <Switch
                    id="track-confidence"
                    checked={trackConfidence}
                    onCheckedChange={(checked) => {
                      setTrackConfidence(checked);
                      autoSaveSettings(
                        { trackConfidence: checked },
                        {
                          firstName: editFirstName,
                          lastName: editLastName,
                          displayPreference: editDisplayPreference,
                          showLeaderboard: showLeaderboard,
                          showRank: showRank,
                          showRankPublicly: showRankPublicly,
                          trackConfidence: checked
                        }
                      );
                    }}
                    className="scale-125 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-400"
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
                  onValueChange={(v) => {
                    const newPref = v as 'realName' | 'nickname';
                    setEditDisplayPreference(newPref);
                    autoSaveSettings(
                      { displayPreference: newPref },
                      {
                        firstName: editFirstName,
                        lastName: editLastName,
                        displayPreference: newPref,
                        showLeaderboard: showLeaderboard,
                        showRank: showRank,
                        showRankPublicly: showRankPublicly,
                        trackConfidence: trackConfidence
                      }
                    );
                  }}
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
                      onClick={async () => {
                        const result = await deleteUserAccount(user.id);
                        if (result.success) {
                          await logout();
                          navigate('/');
                          toast.success(result.message || "Account deleted");
                        } else {
                          toast.error(result.message || "Failed to delete account");
                        }
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
