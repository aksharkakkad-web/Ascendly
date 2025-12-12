// Enhanced Question Data Structure for AP Exam Practice Platform
// This file defines the interfaces for the hierarchical structure:
// Class → Unit → Subtopic → Questions
// With comprehensive tracking, metadata, and educational features

export interface QuestionOption {
  id: string; // "A", "B", "C", "D"
  content: string; // Can contain LaTeX math (e.g., "$\\frac{1}{2}$")
}

export interface SkillMastery {
  mastery: number; // 0-1 scale
  trend: "up" | "flat" | "down";
}

export interface QuestionMetadata {
  difficulty: "Easy" | "Medium" | "Hard" | "easy" | "medium" | "hard";
  cognitiveLevel:
    | "Recall"
    | "Application"
    | "Analysis"
    | "Synthesis"
    | "Evaluation"
    | "knowledge"
    | "application"
    | "analysis";
  skillTags: string[]; // e.g., ["chain_rule", "derivatives", "trigonometry"]
}

export interface QuestionUserState {
  status: "unanswered" | "correct" | "incorrect";
  isCorrect: boolean;
  timeSpentSeconds: number;
  attemptCount: number;
  lastAttemptTimestamp: number | null; // Unix timestamp
  answerEvents: { timestamp: string; optionId: string; confidence?: number }[];
  confidence: number | null;
  skillMasterySnapshot: Record<string, SkillMastery>;
  lastPracticedAt: string | null;
  streak?: number;
}

export interface Question {
  id: string; // Unique identifier (e.g., "CALCBC-U3-S1-Q01")
  questionText: string; // Can contain LaTeX math
  options: QuestionOption[]; // Array of option objects with id and content
  correctAnswerId: string; // The id of the correct option (e.g., "B")
  explanation: string; // Educational explanation of why the answer is correct
  commonMistakePatterns: string[]; // Common mistakes students make
  metadata: QuestionMetadata;
  userState: QuestionUserState;
}

export interface Subtopic {
  subtopicName: string;
  questions: Question[];
}

export interface Unit {
  unitName: string;
  subtopics: Subtopic[];
}

export interface ClassData {
  className: string;
  units: Unit[];
}

export interface AllClassesData {
  [className: string]: ClassData;
}

// Initialize userState for a new question
export function initializeUserState(): QuestionUserState {
  return {
    status: "unanswered",
    isCorrect: false,
    timeSpentSeconds: 0,
    attemptCount: 0,
    lastAttemptTimestamp: null,
    answerEvents: [],
    confidence: null,
    skillMasterySnapshot: {},
    lastPracticedAt: null,
    streak: 0,
  };
}

// Initialize metadata with defaults
export function initializeMetadata(): QuestionMetadata {
  return {
    difficulty: "Medium",
    cognitiveLevel: "Application",
    skillTags: [],
  };
}

// Generate question ID in format: "CLASS-U#-S#-Q##"
export function generateQuestionId(
  className: string,
  unitNumber: number,
  subtopicNumber: number,
  questionNumber: number
): string {
  const classPrefix = className
    .replace(/AP /g, "")
    .replace(/[^A-Z0-9]/g, "")
    .toUpperCase()
    .substring(0, 5);
  return `${classPrefix}-U${unitNumber}-S${subtopicNumber}-Q${String(questionNumber).padStart(2, "0")}`;
}

// Parse question ID into components
export function parseQuestionId(questionId: string): {
  className: string;
  unitNumber: number;
  subtopicNumber: number;
  questionNumber: number;
} | null {
  // Format: "CALCBC-U3-S1-Q01"
  const match = questionId.match(/^([A-Z]+)-U(\d+)-S(\d+)-Q(\d+)$/);
  if (!match) return null;
  
  return {
    className: match[1],
    unitNumber: parseInt(match[2], 10),
    subtopicNumber: parseInt(match[3], 10),
    questionNumber: parseInt(match[4], 10),
  };
}

// Legacy support: Convert old question format to new format
export function migrateQuestion(oldQuestion: any): Question {
  return {
    id: oldQuestion.id || "",
    questionText: oldQuestion.question || oldQuestion.questionText || "",
    options: Array.isArray(oldQuestion.options) && oldQuestion.options.length > 0 && typeof oldQuestion.options[0] === "object"
      ? oldQuestion.options
      : (oldQuestion.options || []).map((opt: string, idx: number) => ({
          id: String.fromCharCode(65 + idx), // A, B, C, D
          content: opt,
        })),
    correctAnswerId: oldQuestion.correctAnswerId || oldQuestion.answer || "",
    explanation: oldQuestion.explanation || "",
    commonMistakePatterns: oldQuestion.commonMistakePatterns || [],
    metadata: oldQuestion.metadata || initializeMetadata(),
    userState: oldQuestion.userState || initializeUserState(),
  };
}
