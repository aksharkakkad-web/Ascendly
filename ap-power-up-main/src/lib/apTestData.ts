// AP Test Data Types
// Defines interfaces for AP-style full-length test structure and tracking

import { StimulusItem, StimulusMeta, StimulusPerformance } from "./questionData";

export interface APTestQuestion {
  id: number;
  question_text: string; // Can contain LaTeX
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: "A" | "B" | "C" | "D";
  skill_type: string; // e.g., "Conceptual", "Calculation", "Analysis", "Interpretation"
  difficulty: "Easy" | "Medium" | "Hard";
  estimated_time_seconds: number;
  tags: string[]; // Topic tags
  stimulus?: StimulusItem[];
  stimulusMeta?: StimulusMeta;
  userState?: {
    status: "unanswered" | "correct" | "incorrect";
    isCorrect: boolean;
    timeSpentSeconds: number;
    attemptCount: number;
    lastAttemptTimestamp: number | null;
    answerEvents: { timestamp: string; optionId: string; confidence?: number }[];
    confidence: number | null;
    skillMasterySnapshot: Record<string, any>;
    lastPracticedAt: string | null;
    stimulusPerformance?: StimulusPerformance;
  };
}

export interface APTest {
  test_id: number;
  total_questions: number;
  time_limit_minutes: number;
  questions: APTestQuestion[];
}

export interface APTestData {
  ap_class: string;
  test_id: number; // The test_id from the JSON structure
  total_questions: number;
  time_limit_minutes: number;
  questions: APTestQuestion[];
}

export interface APTestClassFile {
  ap_class: string;
  tests: APTest[];
}

// Response tracking for a single question during test
export interface APTestQuestionResponse {
  questionId: number;
  userAnswer: "A" | "B" | "C" | "D" | null;
  isCorrect: boolean;
  timeSpentSeconds: number;
  answerChanges: number; // Number of times user changed their answer
  skillType: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  estimatedTimeSeconds: number;
  startTime: number; // Timestamp when question was first viewed
  endTime: number; // Timestamp when answer was submitted
  stimulusPerformance?: StimulusPerformance;
}

// Full test attempt with all responses and summary
export interface APTestAttempt {
  id: string; // Unique attempt ID
  userId: string;
  apClass: string;
  testId: number; // The test_id from the JSON structure
  startTimestamp: string; // ISO string
  endTimestamp: string; // ISO string
  totalTimeUsedSeconds: number;
  responses: APTestQuestionResponse[];
  summary: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    unansweredQuestions: number;
    overallAccuracy: number; // 0-1
    accuracyBySkillType: Record<string, { correct: number; total: number; accuracy: number }>;
    accuracyByTag: Record<string, { correct: number; total: number; accuracy: number }>;
    timeManagement: {
      totalEstimatedTime: number;
      totalActualTime: number;
      averageTimePerQuestion: number;
      questionsOverTime: number; // Questions that took longer than estimated
      questionsUnderTime: number; // Questions that took less than estimated
    };
    predictedAPScore: number; // 1-5 scale
  };
}

// Helper function to calculate predicted AP score from accuracy with tier information
export interface PredictedAPScoreInfo {
  score: number;
  tier: 'Borderline' | 'On Track' | 'Secure';
  percentage: number;
  range: string;
}

export function calculatePredictedAPScore(accuracy: number): number {
  // AP scoring is typically:
  // 5: 75-100% (typically 80%+)
  // 4: 60-74% (typically 65-79%)
  // 3: 45-59% (typically 50-64%)
  // 2: 30-44%
  // 1: 0-29%
  if (accuracy >= 0.80) return 5;
  if (accuracy >= 0.65) return 4;
  if (accuracy >= 0.50) return 3;
  if (accuracy >= 0.30) return 2;
  return 1;
}

export function calculatePredictedAPScoreWithTier(accuracy: number): PredictedAPScoreInfo {
  const percentage = Math.round(accuracy * 100);
  
  // Score 5: 80-100%
  if (percentage >= 80) {
    if (percentage >= 90) {
      return { score: 5, tier: 'Secure', percentage, range: '90-100%' };
    } else if (percentage >= 85) {
      return { score: 5, tier: 'On Track', percentage, range: '85-89%' };
    } else {
      return { score: 5, tier: 'Borderline', percentage, range: '80-84%' };
    }
  }
  
  // Score 4: 65-79%
  if (percentage >= 65) {
    if (percentage >= 74) {
      return { score: 4, tier: 'Secure', percentage, range: '74-79%' };
    } else if (percentage >= 70) {
      return { score: 4, tier: 'On Track', percentage, range: '70-73%' };
    } else {
      return { score: 4, tier: 'Borderline', percentage, range: '65-69%' };
    }
  }
  
  // Score 3: 50-64%
  if (percentage >= 50) {
    if (percentage >= 58) {
      return { score: 3, tier: 'Secure', percentage, range: '58-64%' };
    } else if (percentage >= 54) {
      return { score: 3, tier: 'On Track', percentage, range: '54-57%' };
    } else {
      return { score: 3, tier: 'Borderline', percentage, range: '50-53%' };
    }
  }
  
  // Score 2: 30-49%
  if (percentage >= 30) {
    if (percentage >= 40) {
      return { score: 2, tier: 'Secure', percentage, range: '40-49%' };
    } else if (percentage >= 35) {
      return { score: 2, tier: 'On Track', percentage, range: '35-39%' };
    } else {
      return { score: 2, tier: 'Borderline', percentage, range: '30-34%' };
    }
  }
  
  // Score 1: 0-29%
  return { score: 1, tier: 'Borderline', percentage, range: '0-29%' };
}

// Helper function to generate unique attempt ID
export function generateAPTestAttemptId(): string {
  return `ap-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
