// Comprehensive Scoring System for Ascendly

const BASE_POINTS = 10;
const EXPECTED_TIME_SECONDS = 60;
const MAX_SPEED_BONUS = 0.20; // +20%
const MAX_MASTERY_PENALTY = 0.50; // -50%
const MASTERY_WINDOW_DAYS = 30;
const DAILY_POINTS_CAP = 2000;
const STREAK_BONUS_PER_DAY = 0.02; // +2%
const MAX_STREAK_BONUS = 0.40; // +40%
const ACCURACY_BONUS_THRESHOLD = 0.70;
const ACCURACY_BONUS_MULTIPLIER = 0.5;
const WEEKLY_DECAY_RATE = 0.02; // 2% per week
const DAILY_DECAY_RATE = WEEKLY_DECAY_RATE / 7; // ~0.286% per day

export interface QuestionScoringResult {
  basePoints: number;
  attemptMultiplier: number;
  speedBonus: number;
  masteryPenalty: number;
  finalQuestionPoints: number;
}

export interface SessionScoringResult {
  questionPoints: number;
  accuracyBonus: number;
  streakMultiplier: number;
  totalBeforeCap: number;
  dailyCapApplied: boolean;
  finalSessionPoints: number;
}

// Get attempt multiplier based on attempt number
export function getAttemptMultiplier(attemptNumber: number): number {
  if (attemptNumber === 1) return 1.0;
  if (attemptNumber === 2) return 0.5;
  return 0;
}

// Calculate speed bonus (0 to MAX_SPEED_BONUS)
// Scales linearly: 20% at instant answer, 0% at 60 seconds
export function calculateSpeedBonus(timeTakenSeconds: number): number {
  if (timeTakenSeconds >= EXPECTED_TIME_SECONDS) return 0;
  
  // Linear scaling: faster = more bonus
  // At 0s: 20% bonus, at 30s: 10% bonus, at 60s: 0% bonus
  const timeRemaining = EXPECTED_TIME_SECONDS - timeTakenSeconds;
  return (timeRemaining / EXPECTED_TIME_SECONDS) * MAX_SPEED_BONUS;
}

// Calculate mastery penalty based on recent correct answers
export function calculateMasteryPenalty(recentCorrectTimestamps: string[]): number {
  const now = Date.now();
  const thirtyDaysAgo = now - (MASTERY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  
  // Filter to only recent correct answers
  const recentCorrects = recentCorrectTimestamps.filter(ts => {
    return new Date(ts).getTime() > thirtyDaysAgo;
  });
  
  if (recentCorrects.length === 0) return 0;
  
  // Penalty increases with each recent correct: 15% per recent correct, capped at 50%
  const penaltyPerCorrect = 0.15;
  return Math.min(recentCorrects.length * penaltyPerCorrect, MAX_MASTERY_PENALTY);
}

// Calculate points for a single question
export function calculateQuestionPoints(
  isCorrect: boolean,
  attemptNumber: number,
  timeTakenSeconds: number,
  recentCorrectTimestamps: string[]
): QuestionScoringResult {
  if (!isCorrect) {
    return {
      basePoints: BASE_POINTS,
      attemptMultiplier: 0,
      speedBonus: 0,
      masteryPenalty: 0,
      finalQuestionPoints: 0
    };
  }

  const attemptMultiplier = getAttemptMultiplier(attemptNumber);
  
  // If no points available due to attempts, return 0
  if (attemptMultiplier === 0) {
    return {
      basePoints: BASE_POINTS,
      attemptMultiplier: 0,
      speedBonus: 0,
      masteryPenalty: 0,
      finalQuestionPoints: 0
    };
  }

  const speedBonus = calculateSpeedBonus(timeTakenSeconds);
  const masteryPenalty = calculateMasteryPenalty(recentCorrectTimestamps);

  // Final = base × attempt × (1 + speed) × (1 - mastery)
  const finalQuestionPoints = Math.round(
    BASE_POINTS * attemptMultiplier * (1 + speedBonus) * (1 - masteryPenalty)
  );

  return {
    basePoints: BASE_POINTS,
    attemptMultiplier,
    speedBonus,
    masteryPenalty,
    finalQuestionPoints: Math.max(0, finalQuestionPoints)
  };
}

// Calculate session-level bonuses
export function calculateSessionBonus(
  totalQuestionPoints: number,
  correctAnswers: number,
  totalQuestions: number,
  streakDays: number,
  dailyPointsEarnedSoFar: number
): SessionScoringResult {
  const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  
  // Accuracy bonus (only if above 70%)
  let accuracyBonus = 0;
  if (accuracy > ACCURACY_BONUS_THRESHOLD) {
    const amountAbove = accuracy - ACCURACY_BONUS_THRESHOLD;
    accuracyBonus = Math.round(totalQuestionPoints * amountAbove * ACCURACY_BONUS_MULTIPLIER);
  }

  const pointsAfterAccuracy = totalQuestionPoints + accuracyBonus;

  // Streak multiplier
  const streakBonus = Math.min(streakDays * STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS);
  const streakMultiplier = 1 + streakBonus;
  
  const totalBeforeCap = Math.round(pointsAfterAccuracy * streakMultiplier);

  // Apply daily cap
  const remainingDailyCap = Math.max(0, DAILY_POINTS_CAP - dailyPointsEarnedSoFar);
  const finalSessionPoints = Math.min(totalBeforeCap, remainingDailyCap);
  const dailyCapApplied = totalBeforeCap > remainingDailyCap;

  return {
    questionPoints: totalQuestionPoints,
    accuracyBonus,
    streakMultiplier,
    totalBeforeCap,
    dailyCapApplied,
    finalSessionPoints
  };
}

// Apply decay to leaderboard score
export function applyLeaderboardDecay(
  currentScore: number,
  lastDecayTimestamp: string
): { newScore: number; daysSinceDecay: number } {
  const lastDecay = new Date(lastDecayTimestamp).getTime();
  const now = Date.now();
  const daysSinceDecay = (now - lastDecay) / (24 * 60 * 60 * 1000);
  
  if (daysSinceDecay < 1) {
    return { newScore: currentScore, daysSinceDecay };
  }

  // Apply fractional daily decay
  const decayFactor = Math.pow(1 - DAILY_DECAY_RATE, daysSinceDecay);
  const newScore = Math.round(currentScore * decayFactor);
  
  return { newScore, daysSinceDecay };
}

// Format points breakdown for display
export function formatPointsBreakdown(result: QuestionScoringResult): string {
  if (result.attemptMultiplier === 0) {
    return "No points (3rd+ attempt)";
  }
  
  let breakdown = `${result.basePoints} base`;
  
  if (result.attemptMultiplier < 1) {
    breakdown += ` × ${result.attemptMultiplier} (2nd attempt)`;
  }
  
  if (result.speedBonus > 0) {
    breakdown += ` × ${(1 + result.speedBonus).toFixed(2)} speed`;
  }
  
  if (result.masteryPenalty > 0) {
    breakdown += ` × ${(1 - result.masteryPenalty).toFixed(2)} mastery`;
  }
  
  return breakdown;
}

export function formatSessionBreakdown(result: SessionScoringResult): string {
  let breakdown = `${result.questionPoints} question pts`;
  
  if (result.accuracyBonus > 0) {
    breakdown += ` + ${result.accuracyBonus} accuracy bonus`;
  }
  
  if (result.streakMultiplier > 1) {
    breakdown += ` × ${result.streakMultiplier.toFixed(2)} streak`;
  }
  
  if (result.dailyCapApplied) {
    breakdown += ` (capped)`;
  }
  
  return breakdown;
}
