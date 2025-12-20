import { loadClassData, clearCache } from "./jsonLoader";
import { QuestionAttempt, getAllQuestionAnalytics } from "./database";
import { ClassData, Question } from "./questionData";

type WithContext = {
  key: string;
  unitName: string;
  subtopicName: string;
  question: Question;
  attempt?: QuestionAttempt;
};

export interface SkillStat {
  skill: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  attempts: number;
  accuracy: number;
  avgTimeSeconds: number;
  streak: number;
  mastery: number;
  mistakeCounts: Record<string, number>;
  fragile: boolean;
}

export interface BucketStat {
  key: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  attempts: number;
  accuracy: number;
  avgTimeSeconds: number;
  unanswered: number;
}

export interface UnitStat extends BucketStat {
  subtopics: SubtopicStat[];
}

export interface SubtopicStat extends BucketStat {}

export interface StreakInsight {
  skill: string;
  best: number;
  current: number;
}

export interface Suggestion {
  questionId: string;
  questionText: string;
  unitName: string;
  subtopicName: string;
  reason: string;
}

export interface WeakSkill {
  skill: string;
  accuracy: number;
  mastery: number;
  mistakeCount: number;
  avgTimeSeconds: number;
  confidence?: number;
  weakScore: number; // Composite score for prioritizing
  questionIds: string[]; // Questions that need practice for this skill
}

export interface StrengthSkill {
  skill: string;
  accuracy: number;
  mastery: number;
  strengthScore: number;
}

export interface StimulusAnalytics {
  totalStimulusQuestions: number;
  attemptedStimulusQuestions: number;
  correctStimulusQuestions: number;
  avgStimulusAccuracy: number;
  avgStimulusStruggleScore: number;
  avgStimulusTimeSeconds: number;
  byType: Record<string, {
    count: number;
    attempted: number;
    correct: number;
    accuracy: number;
    avgStruggleScore: number;
    avgTimeSeconds: number;
  }>;
  byComplexity: Record<string, {
    count: number;
    attempted: number;
    correct: number;
    accuracy: number;
    avgStruggleScore: number;
    avgTimeSeconds: number;
  }>;
}

export interface AdvancedAnalytics {
  summary: {
    totalQuestions: number;
    attemptedQuestions: number;
    correctQuestions: number;
    avgAccuracy: number;
    avgTimeSeconds: number;
    unanswered: number;
  };
  skills: SkillStat[];
  units: UnitStat[];
  subtopics: SubtopicStat[];
  difficulties: BucketStat[];
  cognitive: BucketStat[];
  mistakePatterns: { skill: string; pattern: string; count: number }[];
  streaks: StreakInsight[];
  fragileSkills: string[];
  suggestions: Suggestion[];
  unansweredQuestions: string[];
  weakSkills: WeakSkill[];
  strengthSkills: StrengthSkill[];
  practiceQuestions: string[]; // Question IDs filtered by weak skills
  stimulusAnalytics?: StimulusAnalytics;
}

function buildQuestionKey(className: string, unitName: string, subtopicName: string, index: number, question: Question) {
  return question.id && question.id.length > 0
    ? question.id
    : `${className}:${unitName}:${subtopicName}:${index}`;
}

function safeLower(str: string | undefined) {
  return (str || "").toLowerCase();
}

function ensureAttemptDefaults(attempt?: QuestionAttempt) {
  if (!attempt) return undefined;
  return {
    ...attempt,
    timeSpentSeconds: attempt.timeSpentSeconds || 0,
    attempts: attempt.attempts || 0,
    correctAttempts: attempt.correctAttempts || 0,
    answerEvents: attempt.answerEvents || [],
  };
}

export async function computeAdvancedAnalytics(
  userId: string,
  className: string
): Promise<AdvancedAnalytics | null> {
  // Clear cache to ensure we get latest unit names from JSON
  clearCache();
  const classData: ClassData | null = await loadClassData(className);
  if (!classData) return null;

  const attempts = await getAllQuestionAnalytics(userId);
  
  const attemptMap = new Map<string, QuestionAttempt>(
    attempts.map((a) => [a.questionId, ensureAttemptDefaults(a)!])
  );

  const questions: WithContext[] = [];
  classData.units.forEach((unit) => {
    unit.subtopics.forEach((subtopic) => {
      subtopic.questions.forEach((q, idx) => {
        const key = buildQuestionKey(className, unit.unitName, subtopic.subtopicName, idx, q);
        questions.push({
          key,
          unitName: unit.unitName,
          subtopicName: subtopic.subtopicName,
          question: q,
          attempt: attemptMap.get(key),
        });
      });
    });
  });

  const summary = {
    totalQuestions: questions.length,
    attemptedQuestions: 0,
    correctQuestions: 0,
    avgAccuracy: 0,
    avgTimeSeconds: 0,
    unanswered: 0,
  };

  let totalTime = 0;
  let totalAttempts = 0;

  const skillBuckets = new Map<string, SkillStat>();
  const unitBuckets = new Map<string, UnitStat>();
  const subtopicBuckets = new Map<string, SubtopicStat>();
  const diffBuckets = new Map<string, BucketStat>();
  const cogBuckets = new Map<string, BucketStat>();
  const streaks = new Map<string, { best: number; current: number }>();
  const unansweredQuestions: string[] = [];

  questions.forEach((item) => {
    const { attempt, question, unitName, subtopicName, key } = item;
    const skillTags = question.metadata?.skillTags || [];
    const attempted = !!attempt;
    const correct = attempt?.isCorrect ?? false;
    const attemptsCount = attempt?.attempts ?? 0;
    const timeSpent = attempt?.timeSpentSeconds ?? 0;

    if (attempted) summary.attemptedQuestions += 1;
    if (correct) summary.correctQuestions += 1;
    if (!attempted) summary.unanswered += 1;
    if (!attempted) unansweredQuestions.push(key);

    totalTime += timeSpent;
    totalAttempts += attemptsCount || (attempted ? 1 : 0);

    // Skill buckets
    skillTags.forEach((skill) => {
      const bucket =
        skillBuckets.get(skill) ||
        {
          skill,
          totalQuestions: 0,
          attemptedQuestions: 0,
          correctQuestions: 0,
          attempts: 0,
          accuracy: 0,
          avgTimeSeconds: 0,
          streak: 0,
          mastery: 0,
          mistakeCounts: {},
          fragile: false,
        };
      bucket.totalQuestions += 1;
      bucket.attempts += attemptsCount;
      if (attempted) bucket.attemptedQuestions += 1;
      if (correct) bucket.correctQuestions += 1;
      bucket.avgTimeSeconds += timeSpent;
      bucket.streak = Math.max(bucket.streak, attempt?.streak ?? 0);
      // simple mastery proxy
      const masteredAttempts = attempt?.correctAttempts ?? (correct ? 1 : 0);
      const masteryDenom = Math.max(attemptsCount, masteredAttempts, attempted ? 1 : 0);
      bucket.mastery += masteryDenom ? masteredAttempts / masteryDenom : 0;
      if (attempted && !correct) {
        question.commonMistakePatterns?.forEach((m) => {
          bucket.mistakeCounts[m] = (bucket.mistakeCounts[m] || 0) + 1;
        });
      }
      skillBuckets.set(skill, bucket);

      // streak tracking
      const skillStreak = streaks.get(skill) || { best: 0, current: 0 };
      const newCurrent = correct ? skillStreak.current + 1 : 0;
      const newBest = Math.max(skillStreak.best, newCurrent);
      streaks.set(skill, { best: newBest, current: newCurrent });
    });

    // Unit bucket
    const unitKey = unitName;
    const unitBucket =
      unitBuckets.get(unitKey) ||
      {
        key: unitKey,
        totalQuestions: 0,
        attemptedQuestions: 0,
        correctQuestions: 0,
        attempts: 0,
        accuracy: 0,
        avgTimeSeconds: 0,
        unanswered: 0,
        subtopics: [],
      };
    unitBucket.totalQuestions += 1;
    unitBucket.attempts += attemptsCount;
    unitBucket.avgTimeSeconds += timeSpent;
    if (attempted) unitBucket.attemptedQuestions += 1;
    if (correct) unitBucket.correctQuestions += 1;
    if (!attempted) unitBucket.unanswered += 1;
    unitBuckets.set(unitKey, unitBucket);

    // Subtopic bucket
    const subKey = `${unitName} → ${subtopicName}`;
    const subBucket =
      subtopicBuckets.get(subKey) ||
      {
        key: subKey,
        totalQuestions: 0,
        attemptedQuestions: 0,
        correctQuestions: 0,
        attempts: 0,
        accuracy: 0,
        avgTimeSeconds: 0,
        unanswered: 0,
      };
    subBucket.totalQuestions += 1;
    subBucket.attempts += attemptsCount;
    subBucket.avgTimeSeconds += timeSpent;
    if (attempted) subBucket.attemptedQuestions += 1;
    if (correct) subBucket.correctQuestions += 1;
    if (!attempted) subBucket.unanswered += 1;
    subtopicBuckets.set(subKey, subBucket);

    // Difficulty bucket
    const difficultyKey = safeLower(question.metadata?.difficulty || "unknown");
    const diffBucket =
      diffBuckets.get(difficultyKey) ||
      {
        key: difficultyKey,
        totalQuestions: 0,
        attemptedQuestions: 0,
        correctQuestions: 0,
        attempts: 0,
        accuracy: 0,
        avgTimeSeconds: 0,
        unanswered: 0,
      };
    diffBucket.totalQuestions += 1;
    diffBucket.attempts += attemptsCount;
    diffBucket.avgTimeSeconds += timeSpent;
    if (attempted) diffBucket.attemptedQuestions += 1;
    if (correct) diffBucket.correctQuestions += 1;
    if (!attempted) diffBucket.unanswered += 1;
    diffBuckets.set(difficultyKey, diffBucket);

    // Cognitive bucket
    const cogKey = safeLower(question.metadata?.cognitiveLevel || "unknown");
    const cogBucket =
      cogBuckets.get(cogKey) ||
      {
        key: cogKey,
        totalQuestions: 0,
        attemptedQuestions: 0,
        correctQuestions: 0,
        attempts: 0,
        accuracy: 0,
        avgTimeSeconds: 0,
        unanswered: 0,
      };
    cogBucket.totalQuestions += 1;
    cogBucket.attempts += attemptsCount;
    cogBucket.avgTimeSeconds += timeSpent;
    if (attempted) cogBucket.attemptedQuestions += 1;
    if (correct) cogBucket.correctQuestions += 1;
    if (!attempted) cogBucket.unanswered += 1;
    cogBuckets.set(cogKey, cogBucket);
  });

  summary.avgAccuracy =
    summary.attemptedQuestions > 0 ? summary.correctQuestions / summary.attemptedQuestions : 0;
  summary.avgTimeSeconds = totalAttempts > 0 ? totalTime / totalAttempts : 0;

  const skills = Array.from(skillBuckets.values()).map((s) => {
    const accuracy = s.attemptedQuestions > 0 ? s.correctQuestions / s.attemptedQuestions : 0;
    return {
      ...s,
      accuracy,
      avgTimeSeconds: s.attempts > 0 ? s.avgTimeSeconds / s.attempts : 0,
      mastery: s.totalQuestions > 0 ? s.mastery / s.totalQuestions : 0,
      fragile: s.attemptedQuestions >= 3 && accuracy < 0.7 && s.streak < 2,
    };
  });

  const fragileSkills = skills.filter((s) => s.fragile).map((s) => s.skill);

  // Calculate subtopics first with accuracy before assigning to units
  const subtopics = Array.from(subtopicBuckets.values()).map((s) => ({
    ...s,
    accuracy: s.attemptedQuestions > 0 ? s.correctQuestions / s.attemptedQuestions : 0,
    avgTimeSeconds: s.attempts > 0 ? s.avgTimeSeconds / s.attempts : 0,
  }));

  const units = Array.from(unitBuckets.values()).map((u) => ({
    ...u,
    accuracy: u.attemptedQuestions > 0 ? u.correctQuestions / u.attemptedQuestions : 0,
    avgTimeSeconds: u.attempts > 0 ? u.avgTimeSeconds / u.attempts : 0,
    subtopics: subtopics.filter((s) => s.key.startsWith(`${u.key} →`)),
  }));

  const difficulties = Array.from(diffBuckets.values()).map((d) => ({
    ...d,
    accuracy: d.attemptedQuestions > 0 ? d.correctQuestions / d.attemptedQuestions : 0,
    avgTimeSeconds: d.attempts > 0 ? d.avgTimeSeconds / d.attempts : 0,
  }));

  const cognitive = Array.from(cogBuckets.values()).map((c) => ({
    ...c,
    accuracy: c.attemptedQuestions > 0 ? c.correctQuestions / c.attemptedQuestions : 0,
    avgTimeSeconds: c.attempts > 0 ? c.avgTimeSeconds / c.attempts : 0,
  }));

  const mistakePatterns: { skill: string; pattern: string; count: number }[] = [];
  skills.forEach((skill) => {
    Object.entries(skill.mistakeCounts).forEach(([pattern, count]) => {
      mistakePatterns.push({ skill: skill.skill, pattern, count });
    });
  });

  // Streak insights
  const streakInsights: StreakInsight[] = Array.from(streaks.entries()).map(([skill, value]) => ({
    skill,
    best: value.best,
    current: value.current,
  }));

  // Suggest next questions: prioritize unanswered then low mastery/accuracy
  const suggestions: Suggestion[] = questions
    .map((q) => {
      const skillAccuracies = q.question.metadata.skillTags.map((s) => {
        const skill = skills.find((k) => k.skill === s);
        return skill ? skill.accuracy : 0.5;
      });
      const lowestSkillAcc = skillAccuracies.length ? Math.min(...skillAccuracies) : 0.5;
      const attemptsCount = q.attempt?.attempts ?? 0;
      const mastered = q.attempt?.isCorrect ?? false;
      const priorityScore = (mastered ? 1 : 0) + lowestSkillAcc + attemptsCount * 0.05;
      return {
        questionId: q.key,
        questionText: q.question.questionText,
        unitName: q.unitName,
        subtopicName: q.subtopicName,
        reason: mastered ? "Reinforce for mastery" : "Target weak skill",
        priorityScore,
      };
    })
    .sort((a, b) => a.priorityScore - b.priorityScore)
    .slice(0, 5)
    .map((s) => ({
      questionId: s.questionId,
      questionText: s.questionText,
      unitName: s.unitName,
      subtopicName: s.subtopicName,
      reason: s.reason,
    }));

  // Detect weak skills
  const weakSkills = detectWeakSkills(skills, questions, attempts);
  
  // Get strength skills (top performers)
  const strengthSkills = detectStrengthSkills(skills);
  
  // Get practice questions for weak skills (this now includes fallback for all incorrect answers)
  const practiceQuestions = getPracticeQuestionsForWeakSkills(weakSkills, questions);
  
  // Final validation: Log if we have incorrect attempts but no practice questions (for debugging)
  const hasIncorrectAttempts = questions.some(q => q.attempt && q.attempt.isCorrect === false);
  if (hasIncorrectAttempts && practiceQuestions.length === 0) {
    console.warn('[Analytics] Found incorrect attempts but no practice questions generated. This should not happen.');
  }

  // Compute stimulus analytics
  const stimulusQuestions = questions.filter(q => q.question.stimulusMeta?.hasStimulus);
  const stimulusByType: Record<string, { count: number; attempted: number; correct: number; totalTime: number; totalStruggle: number }> = {};
  const stimulusByComplexity: Record<string, { count: number; attempted: number; correct: number; totalTime: number; totalStruggle: number }> = {};
  
  let totalStimulusQuestions = 0;
  let attemptedStimulusQuestions = 0;
  let correctStimulusQuestions = 0;
  let totalStimulusTime = 0;
  let totalStimulusStruggle = 0;

  stimulusQuestions.forEach((item) => {
    const { question, attempt } = item;
    const stimulusMeta = question.stimulusMeta;
    if (!stimulusMeta?.hasStimulus) return;

    totalStimulusQuestions++;
    const attempted = !!attempt;
    const correct = attempt?.isCorrect ?? false;
    const timeSpent = attempt?.timeSpentSeconds ?? 0;
    const struggleScore = attempt?.stimulusPerformance?.struggleScore ?? 0;

    if (attempted) {
      attemptedStimulusQuestions++;
      totalStimulusTime += timeSpent;
      totalStimulusStruggle += struggleScore;
    }
    if (correct) {
      correctStimulusQuestions++;
    }

    // Group by stimulus types
    stimulusMeta.stimulusTypes.forEach((type) => {
      if (!stimulusByType[type]) {
        stimulusByType[type] = { count: 0, attempted: 0, correct: 0, totalTime: 0, totalStruggle: 0 };
      }
      stimulusByType[type].count++;
      if (attempted) {
        stimulusByType[type].attempted++;
        stimulusByType[type].totalTime += timeSpent;
        stimulusByType[type].totalStruggle += struggleScore;
      }
      if (correct) {
        stimulusByType[type].correct++;
      }
    });

    // Group by complexity
    const complexity = stimulusMeta.stimulusComplexity;
    if (!stimulusByComplexity[complexity]) {
      stimulusByComplexity[complexity] = { count: 0, attempted: 0, correct: 0, totalTime: 0, totalStruggle: 0 };
    }
    stimulusByComplexity[complexity].count++;
    if (attempted) {
      stimulusByComplexity[complexity].attempted++;
      stimulusByComplexity[complexity].totalTime += timeSpent;
      stimulusByComplexity[complexity].totalStruggle += struggleScore;
    }
    if (correct) {
      stimulusByComplexity[complexity].correct++;
    }
  });

  // Build stimulus analytics object
  const stimulusAnalytics: StimulusAnalytics | undefined = totalStimulusQuestions > 0 ? {
    totalStimulusQuestions,
    attemptedStimulusQuestions,
    correctStimulusQuestions,
    avgStimulusAccuracy: attemptedStimulusQuestions > 0 ? correctStimulusQuestions / attemptedStimulusQuestions : 0,
    avgStimulusStruggleScore: attemptedStimulusQuestions > 0 ? totalStimulusStruggle / attemptedStimulusQuestions : 0,
    avgStimulusTimeSeconds: attemptedStimulusQuestions > 0 ? totalStimulusTime / attemptedStimulusQuestions : 0,
    byType: Object.fromEntries(
      Object.entries(stimulusByType).map(([type, stats]) => [
        type,
        {
          count: stats.count,
          attempted: stats.attempted,
          correct: stats.correct,
          accuracy: stats.attempted > 0 ? stats.correct / stats.attempted : 0,
          avgStruggleScore: stats.attempted > 0 ? stats.totalStruggle / stats.attempted : 0,
          avgTimeSeconds: stats.attempted > 0 ? stats.totalTime / stats.attempted : 0,
        },
      ])
    ),
    byComplexity: Object.fromEntries(
      Object.entries(stimulusByComplexity).map(([complexity, stats]) => [
        complexity,
        {
          count: stats.count,
          attempted: stats.attempted,
          correct: stats.correct,
          accuracy: stats.attempted > 0 ? stats.correct / stats.attempted : 0,
          avgStruggleScore: stats.attempted > 0 ? stats.totalStruggle / stats.attempted : 0,
          avgTimeSeconds: stats.attempted > 0 ? stats.totalTime / stats.attempted : 0,
        },
      ])
    ),
  } : undefined;

  return {
    summary,
    skills,
    units,
    subtopics,
    difficulties,
    cognitive,
    mistakePatterns,
    streaks: streakInsights,
    fragileSkills,
    suggestions,
    unansweredQuestions,
    weakSkills,
    strengthSkills,
    practiceQuestions,
    stimulusAnalytics,
  };
}

/**
 * Detects weak skills - returns 3 worst skills by lowest accuracy (<70%)
 * Based purely on accuracy, not number of questions answered
 */
function detectWeakSkills(
  skills: SkillStat[],
  questions: WithContext[],
  attempts: QuestionAttempt[]
): WeakSkill[] {
  const attemptMap = new Map<string, QuestionAttempt>(attempts.map((a) => [a.questionId, a]));
  
  // Build question map by skill
  const questionsBySkill = new Map<string, WithContext[]>();
  questions.forEach((q) => {
    q.question.metadata?.skillTags?.forEach((skill) => {
      if (!questionsBySkill.has(skill)) {
        questionsBySkill.set(skill, []);
      }
      questionsBySkill.get(skill)!.push(q);
    });
  });

  // Needs Practice: 3 worst skills by lowest accuracy (<70%)
  // Only include skills that have been attempted and have <70% accuracy
  const weakSkillsData: WeakSkill[] = skills
    .filter((skill) => {
      // Must have at least 1 attempt and accuracy < 70%
      return skill.attemptedQuestions > 0 && skill.accuracy < 0.7;
    })
    .map((skill) => {
      // Calculate mistake count (sum of all mistake pattern counts)
      const mistakeCount = Object.values(skill.mistakeCounts).reduce((sum, count) => sum + count, 0);
      
      // Get average confidence for this skill
      const skillQuestions = questionsBySkill.get(skill.skill) || [];
      const confidences: number[] = [];
      skillQuestions.forEach((q) => {
        const attempt = attemptMap.get(q.key);
        if (attempt?.confidence !== null && attempt?.confidence !== undefined) {
          confidences.push(attempt.confidence);
        }
      });
      const avgConfidence = confidences.length > 0 
        ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length 
        : undefined;

      // Get question IDs that need practice (questions with this skill that are incorrect or unanswered)
      const questionIds = skillQuestions
        .filter((q) => {
          const attempt = attemptMap.get(q.key);
          // Include questions that are unanswered OR have an incorrect attempt
          return !attempt || attempt.isCorrect === false;
        })
        .map((q) => q.key);

      return {
        skill: skill.skill,
        accuracy: skill.accuracy,
        mastery: skill.mastery,
        mistakeCount,
        avgTimeSeconds: skill.avgTimeSeconds,
        confidence: avgConfidence,
        weakScore: 1 - skill.accuracy, // Use inverse accuracy as weakScore (lower accuracy = higher weakScore)
        questionIds,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy) // Sort by accuracy ascending (lowest accuracy first)
    .slice(0, 3); // Return top 3 worst skills

  return weakSkillsData;
}

/**
 * Detects strength skills - returns 3 best skills by highest accuracy (>85%)
 * Based purely on accuracy, not number of questions answered
 */
function detectStrengthSkills(skills: SkillStat[]): StrengthSkill[] {
  // Top Strengths: 3 best skills by highest accuracy (>85%)
  // Only include skills that have been attempted and have >85% accuracy
  return skills
    .filter((skill) => {
      // Need at least 1 attempt and accuracy > 85%
      return skill.attemptedQuestions > 0 && skill.accuracy > 0.85;
    })
    .map((skill) => {
      // Calculate strength score (higher = stronger) - use accuracy as primary metric
      const strengthScore = skill.accuracy;
      
      return {
        skill: skill.skill,
        accuracy: skill.accuracy,
        mastery: skill.mastery,
        strengthScore,
      };
    })
    .sort((a, b) => b.accuracy - a.accuracy) // Sort by accuracy descending (highest accuracy first)
    .slice(0, 3); // Return top 3 best skills
}

/**
 * Gets practice questions filtered by weak skills
 * Returns question IDs sorted by priority (weakest skills first)
 */
export function getPracticeQuestionsForWeakSkills(
  weakSkills: WeakSkill[],
  allQuestions: WithContext[]
): string[] {
  // Collect question IDs from weak skills, prioritizing by weakScore
  const questionMap = new Map<string, number>(); // questionId -> priority score
  const questionSet = new Set<string>();

  if (weakSkills.length > 0) {
    // Get top 5 weak skills
    const topWeakSkills = weakSkills.slice(0, 5);
    const weakSkillTags = new Set(topWeakSkills.map((s) => s.skill));

    topWeakSkills.forEach((weakSkill) => {
      weakSkill.questionIds.forEach((qId) => {
        questionSet.add(qId);
        // Use weakScore as priority (higher = more important to practice)
        const currentPriority = questionMap.get(qId) || 0;
        questionMap.set(qId, Math.max(currentPriority, weakSkill.weakScore));
      });
    });

    // Also include questions that have weak skill tags but weren't in the explicit lists
    allQuestions.forEach((q) => {
      const hasWeakSkill = q.question.metadata?.skillTags?.some((tag) => weakSkillTags.has(tag));
      if (hasWeakSkill && !questionSet.has(q.key)) {
        questionSet.add(q.key);
        // Lower priority than explicitly identified questions
        if (!questionMap.has(q.key)) {
          questionMap.set(q.key, 0.5);
        }
      }
    });
  } else {
    // Fallback: If no weak skills detected, find ALL questions with incorrect attempts
    // This ensures practice questions are available even with minimal data
    allQuestions.forEach((q) => {
      const attempt = q.attempt;
      // Include questions that have an attempt marked as incorrect
      if (attempt && attempt.isCorrect === false) {
        questionSet.add(q.key);
        questionMap.set(q.key, 0.3); // Lower priority but still included
      }
    });
  }

  // Additional safety check: Always include ALL questions with incorrect attempts
  // This ensures we never miss practice questions, even if skill detection has issues
  allQuestions.forEach((q) => {
    const attempt = q.attempt;
    // Explicitly check for false (not just falsy) to catch incorrect answers
    if (attempt && attempt.isCorrect === false) {
      questionSet.add(q.key);
      // Only set priority if not already set (preserve higher priorities from weak skills)
      const currentPriority = questionMap.get(q.key) || 0;
      if (currentPriority < 0.2) {
        questionMap.set(q.key, 0.2); // Minimum priority for incorrect answers
      }
    }
  });

  // Sort by priority and limit to 20 questions for a practice session
  const practiceQuestionIds = Array.from(questionSet)
    .sort((a, b) => {
      const priorityA = questionMap.get(a) || 0;
      const priorityB = questionMap.get(b) || 0;
      return priorityB - priorityA; // Higher priority first
    })
    .slice(0, 20);

  return practiceQuestionIds;
}

