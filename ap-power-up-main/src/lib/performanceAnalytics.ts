import { loadClassData } from "./jsonLoader";
import { getAllQuestionAnalytics, QuestionAttempt, getTeacherClassStudents, getDisplayName, User } from "./database";
import { ClassData, Question } from "./questionData";

export interface PlotPoint {
  x: number; // timeSpentSeconds (normalized)
  y: number; // confidence (1-5) or accuracy (0-1)
  isCorrect: boolean;
  questionId: string;
  questionText: string;
  unitName: string;
  subtopicName: string;
  studentName?: string; // For class view
  timeSpentSeconds: number;
  confidence: number | null; // 1 = "Not sure", 2 = "A little unsure", 3 = "Somewhat sure", 4 = "Pretty sure", 5 = "Very sure"
  explanation?: string;
  commonMistakePatterns?: string[];
}

export interface PerformanceData {
  plotPoints: PlotPoint[];
  summary: {
    totalQuestions: number;
    attemptedQuestions: number;
    falseMasteryPoints: number; // high confidence + wrong
    hesitationPoints: number; // low confidence + correct
    avgTimePerUnit: Record<string, number>;
    avgConfidencePerUnit: Record<string, number>;
    overallAccuracy: number;
  };
}

function buildQuestionKey(className: string, unitName: string, subtopicName: string, index: number, question: Question): string {
  return question.id && question.id.length > 0
    ? question.id
    : `${className}:${unitName}:${subtopicName}:${index}`;
}

/**
 * Calculate a gradient score (0-1) based on time, confidence, and correctness
 * Higher score = better performance (fast + high confidence + correct)
 * Lower score = worse performance (slow + low confidence + wrong)
 * 
 * Uses weighted formula:
 * - accuracy_weight = 0.4
 * - time_weight = 0.3
 * - confidence_weight = 0.3
 * 
 * @param timeSpentSeconds - Time spent on question
 * @param confidence - Confidence level (1-5) or null
 * @param isCorrect - Whether answer was correct
 * @param useAccuracy - Whether using accuracy mode (no confidence)
 * @param maxTimeInDataset - Maximum time in the current dataset (for relative normalization)
 */
export function calculateGradientScore(
  timeSpentSeconds: number,
  confidence: number | null,
  isCorrect: boolean,
  useAccuracy: boolean,
  maxTimeInDataset: number = 300 // Maximum time in current dataset for relative normalization
): number {
  // Normalize time relative to dataset
  // time_norm: 1 = fastest (0 time), 0 = slowest (max time in dataset)
  // Higher time = lower score (more red/yellow)
  // Formula: time_norm = max(0, min(1, 1 - (time_spent / max_time_in_dataset)))
  const time_norm = maxTimeInDataset > 0
    ? Math.max(0, Math.min(1, 1 - (timeSpentSeconds / maxTimeInDataset)))
    : 1; // If no max time, assume fast (score = 1)
  
  // confidence_norm: 0 = low (1), 1 = high (5)
  const max_confidence = 5;
  const confidence_norm = confidence !== null 
    ? confidence / max_confidence
    : 0.5; // Neutral if no confidence data
  
  // accuracy_norm: 1 = correct, 0 = incorrect
  const accuracy_norm = isCorrect ? 1 : 0;
  
  // If using accuracy mode, we only use time and accuracy (no confidence)
  if (useAccuracy) {
    // Weight: 60% accuracy, 40% time
    return (accuracy_norm * 0.6) + (time_norm * 0.4);
  }
  
  // Combined score with all three factors
  // accuracy_weight = 0.4, time_weight = 0.3, confidence_weight = 0.3
  const score = (accuracy_norm * 0.4) + (time_norm * 0.3) + (confidence_norm * 0.3);
  
  return Math.max(0, Math.min(1, score)); // Clamp to 0-1
}

/**
 * Get color for a gradient score (0-1)
 * Returns hex color using continuous RGB gradient:
 * - Red (worst) → Yellow → Green (best)
 * 
 * RGB gradient mapping:
 * - If score < 0.5: Interpolate Red → Yellow
 * - If score >= 0.5: Interpolate Yellow → Green
 */
export function getColorForScore(score: number): string {
  // Clamp score to 0-1
  const clampedScore = Math.max(0, Math.min(1, score));
  
  let r: number, g: number, b: number;
  
  // More dramatic gradient with sharper transitions
  // Red zone: 0.0 - 0.3 (pure red to orange-red)
  // Yellow/Orange zone: 0.3 - 0.7 (orange-red to yellow)
  // Green zone: 0.7 - 1.0 (yellow to bright green)
  
  if (clampedScore < 0.3) {
    // Red → Orange-Red (more dramatic, stays red longer)
    // When score = 0: Pure Red (255, 0, 0)
    // When score = 0.3: Orange-Red (255, 100, 0)
    const t = clampedScore / 0.3; // Scale 0→0.3 to 0→1
    r = 255;
    g = Math.round(t * 100); // Only add a bit of green (0→100)
    b = 0;
  } else if (clampedScore < 0.7) {
    // Orange-Red → Yellow (sharp transition)
    // When score = 0.3: Orange-Red (255, 100, 0)
    // When score = 0.7: Yellow (255, 255, 0)
    const t = (clampedScore - 0.3) / 0.4; // Scale 0.3→0.7 to 0→1
    r = 255;
    g = Math.round(100 + (t * 155)); // Increase green from 100 to 255
    b = 0;
  } else {
    // Yellow → Bright Green (sharp transition to green)
    // When score = 0.7: Yellow (255, 255, 0)
    // When score = 1.0: Bright Green (0, 255, 0)
    const t = (clampedScore - 0.7) / 0.3; // Scale 0.7→1.0 to 0→1
    // Use exponential curve for more dramatic transition
    const t2 = Math.pow(t, 1.5); // Makes transition sharper
    r = Math.round(255 * (1 - t2)); // Decrease red more dramatically
    g = 255;
    b = 0;
  }
  
  // Convert to hex
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  if (!c1 || !c2) return color1;
  
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert confidence number to text label
 */
export function getConfidenceLabel(confidence: number | null): string {
  if (confidence === null) return "No confidence data";
  if (confidence === 1) return "Not sure";
  if (confidence === 2) return "A little unsure";
  if (confidence === 3) return "Somewhat sure";
  if (confidence === 4) return "Pretty sure";
  if (confidence === 5) return "Very sure";
  return `Unknown (${confidence})`;
}

/**
 * Transform questions and attempts to plot points
 */
function transformToPlotPoints(
  questions: Array<{
    question: Question;
    unitName: string;
    subtopicName: string;
    questionKey: string;
    attempt?: QuestionAttempt;
    studentName?: string;
  }>,
  useConfidence: boolean,
  maxTime: number
): PlotPoint[] {
  const plotPoints: PlotPoint[] = [];
  
  questions.forEach(({ question, unitName, subtopicName, questionKey, attempt, studentName }) => {
    if (!attempt) return; // Skip unanswered questions
    
    const timeSpentSeconds = attempt.timeSpentSeconds || 0;
    const confidence = attempt.confidence;
    const isCorrect = attempt.isCorrect;
    
    // Don't skip if confidence is null - let the component handle filtering
    // This allows users to see all data and toggle between confidence/accuracy views
    
    // Calculate Y value
    const y = useConfidence 
      ? (confidence || 0) // 1-5 scale
      : (isCorrect ? 1 : 0); // 0 or 1 for accuracy
    
    // Normalize time for X axis (can be adjusted based on question difficulty)
    const normalizedTime = Math.min(timeSpentSeconds, maxTime);
    
    plotPoints.push({
      x: normalizedTime,
      y,
      isCorrect,
      questionId: questionKey,
      questionText: question.questionText,
      unitName,
      subtopicName,
      studentName,
      timeSpentSeconds,
      confidence,
      explanation: question.explanation,
      commonMistakePatterns: question.commonMistakePatterns,
    });
  });
  
  return plotPoints;
}

/**
 * Get performance data for an individual student
 */
export async function getIndividualPerformanceData(
  userId: string,
  className: string
): Promise<PerformanceData | null> {
  const classData = await loadClassData(className);
  if (!classData) return null;
  
  const attempts = await getAllQuestionAnalytics(userId);
  const attemptMap = new Map<string, QuestionAttempt>(
    attempts.map(a => [a.questionId, a])
  );
  
  // Build question list with attempts
  const questions: Array<{
    question: Question;
    unitName: string;
    subtopicName: string;
    questionKey: string;
    attempt?: QuestionAttempt;
  }> = [];
  
  classData.units.forEach(unit => {
    unit.subtopics.forEach(subtopic => {
      subtopic.questions.forEach((q, idx) => {
        const key = buildQuestionKey(className, unit.unitName, subtopic.subtopicName, idx, q);
        const attempt = attemptMap.get(key);
        questions.push({
          question: q,
          unitName: unit.unitName,
          subtopicName: subtopic.subtopicName,
          questionKey: key,
          attempt,
        });
      });
    });
  });
  
  // Calculate max time for normalization (95th percentile)
  const times = questions
    .map(q => q.attempt?.timeSpentSeconds || 0)
    .filter(t => t > 0)
    .sort((a, b) => a - b);
  const maxTime = times.length > 0 
    ? times[Math.floor(times.length * 0.95)] || 300
    : 300;
  
  // Transform to plot points (for both confidence and accuracy views)
  const plotPoints = transformToPlotPoints(questions, true, maxTime);
  
  // Calculate summary statistics
  const attemptedQuestions = questions.filter(q => q.attempt).length;
  const correctQuestions = questions.filter(q => q.attempt?.isCorrect).length;
  const overallAccuracy = attemptedQuestions > 0 ? correctQuestions / attemptedQuestions : 0;
  
  // False mastery: high confidence (4-5) + wrong
  const falseMasteryPoints = plotPoints.filter(
    p => p.confidence !== null && p.confidence >= 4 && !p.isCorrect
  ).length;

  // Hesitation: low confidence (1-2) + correct
  const hesitationPoints = plotPoints.filter(
    p => p.confidence !== null && p.confidence <= 2 && p.isCorrect
  ).length;
  
  // Average time and confidence per unit
  const unitStats = new Map<string, { totalTime: number; totalConfidence: number; count: number }>();
  plotPoints.forEach(point => {
    const stats = unitStats.get(point.unitName) || { totalTime: 0, totalConfidence: 0, count: 0 };
    stats.totalTime += point.timeSpentSeconds;
    if (point.confidence !== null) {
      stats.totalConfidence += point.confidence;
    }
    stats.count += 1;
    unitStats.set(point.unitName, stats);
  });
  
  const avgTimePerUnit: Record<string, number> = {};
  const avgConfidencePerUnit: Record<string, number> = {};
  unitStats.forEach((stats, unitName) => {
    avgTimePerUnit[unitName] = stats.count > 0 ? stats.totalTime / stats.count : 0;
    avgConfidencePerUnit[unitName] = stats.count > 0 ? stats.totalConfidence / stats.count : 0;
  });
  
  return {
    plotPoints,
    summary: {
      totalQuestions: questions.length,
      attemptedQuestions,
      falseMasteryPoints,
      hesitationPoints,
      avgTimePerUnit,
      avgConfidencePerUnit,
      overallAccuracy,
    },
  };
}

/**
 * Get performance data for entire class (aggregated from all students)
 */
export async function getClassPerformanceData(
  className: string,
  teacherId: string
): Promise<PerformanceData | null> {
  const classData = await loadClassData(className);
  if (!classData) return null;
  
  // Get all students in the class
  const students = getTeacherClassStudents(teacherId, className);
  if (students.length === 0) return null;
  
  // Get attempts for all students
  const allAttempts = new Map<string, Array<{ attempt: QuestionAttempt; studentName: string }>>();
  
  for (const student of students) {
    const attempts = await getAllQuestionAnalytics(student.id);
    attempts.forEach(attempt => {
      if (!allAttempts.has(attempt.questionId)) {
        allAttempts.set(attempt.questionId, []);
      }
      allAttempts.get(attempt.questionId)!.push({
        attempt,
        studentName: getDisplayName(student),
      });
    });
  }
  
  // Build question list with all student attempts
  const questions: Array<{
    question: Question;
    unitName: string;
    subtopicName: string;
    questionKey: string;
    attempts: Array<{ attempt: QuestionAttempt; studentName: string }>;
  }> = [];
  
  classData.units.forEach(unit => {
    unit.subtopics.forEach(subtopic => {
      subtopic.questions.forEach((q, idx) => {
        const key = buildQuestionKey(className, unit.unitName, subtopic.subtopicName, idx, q);
        const attempts = allAttempts.get(key) || [];
        questions.push({
          question: q,
          unitName: unit.unitName,
          subtopicName: subtopic.subtopicName,
          questionKey: key,
          attempts,
        });
      });
    });
  });
  
  // Flatten to individual plot points (one per student attempt)
  const flatQuestions: Array<{
    question: Question;
    unitName: string;
    subtopicName: string;
    questionKey: string;
    attempt?: QuestionAttempt;
    studentName?: string;
  }> = [];
  
  questions.forEach(q => {
    q.attempts.forEach(({ attempt, studentName }) => {
      flatQuestions.push({
        question: q.question,
        unitName: q.unitName,
        subtopicName: q.subtopicName,
        questionKey: q.questionKey,
        attempt,
        studentName,
      });
    });
  });
  
  // Calculate max time for normalization
  const times = flatQuestions
    .map(q => q.attempt?.timeSpentSeconds || 0)
    .filter(t => t > 0)
    .sort((a, b) => a - b);
  const maxTime = times.length > 0 
    ? times[Math.floor(times.length * 0.95)] || 300
    : 300;
  
  // Transform to plot points (don't filter by confidence here - component handles it)
  const plotPoints = transformToPlotPoints(flatQuestions, false, maxTime);
  
  // Calculate summary statistics
  const uniqueQuestions = new Set(plotPoints.map(p => p.questionId));
  const attemptedQuestions = uniqueQuestions.size;
  const correctQuestions = new Set(
    plotPoints.filter(p => p.isCorrect).map(p => p.questionId)
  ).size;
  const overallAccuracy = attemptedQuestions > 0 ? correctQuestions / attemptedQuestions : 0;
  
  // False mastery and hesitation points
  const falseMasteryPoints = plotPoints.filter(
    p => p.confidence !== null && p.confidence >= 4 && !p.isCorrect
  ).length;

  const hesitationPoints = plotPoints.filter(
    p => p.confidence !== null && p.confidence <= 2 && p.isCorrect
  ).length;
  
  // Average time and confidence per unit
  const unitStats = new Map<string, { totalTime: number; totalConfidence: number; count: number }>();
  plotPoints.forEach(point => {
    const stats = unitStats.get(point.unitName) || { totalTime: 0, totalConfidence: 0, count: 0 };
    stats.totalTime += point.timeSpentSeconds;
    if (point.confidence !== null) {
      stats.totalConfidence += point.confidence;
    }
    stats.count += 1;
    unitStats.set(point.unitName, stats);
  });
  
  const avgTimePerUnit: Record<string, number> = {};
  const avgConfidencePerUnit: Record<string, number> = {};
  unitStats.forEach((stats, unitName) => {
    avgTimePerUnit[unitName] = stats.count > 0 ? stats.totalTime / stats.count : 0;
    avgConfidencePerUnit[unitName] = stats.count > 0 ? stats.totalConfidence / stats.count : 0;
  });
  
  return {
    plotPoints,
    summary: {
      totalQuestions: questions.length,
      attemptedQuestions,
      falseMasteryPoints,
      hesitationPoints,
      avgTimePerUnit,
      avgConfidencePerUnit,
      overallAccuracy,
    },
  };
}

