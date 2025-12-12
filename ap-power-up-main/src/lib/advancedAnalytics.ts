import { loadClassData } from "./jsonLoader";
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
  const classData: ClassData | null = await loadClassData(className);
  if (!classData) return null;

  const attempts = getAllQuestionAnalytics(userId);
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

  const skills = Array.from(skillBuckets.values()).map((s) => ({
    ...s,
    accuracy: s.attemptedQuestions > 0 ? s.correctQuestions / s.attemptedQuestions : 0,
    avgTimeSeconds: s.attempts > 0 ? s.avgTimeSeconds / s.attempts : 0,
    mastery: s.totalQuestions > 0 ? s.mastery / s.totalQuestions : 0,
    fragile: s.attemptedQuestions >= 3 && s.accuracy < 0.7 && s.streak < 2,
  }));

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
  };
}

/**
 * Detects weak skills based on multiple factors:
 * 1. Repeated mistakes (count of mistake patterns)
 * 2. Low accuracy (< 70%)
 * 3. Low mastery (< 0.7)
 * 4. Low confidence (if available, < 50%)
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

  const weakSkillsData: WeakSkill[] = skills
    .filter((skill) => {
      // Must have at least some attempts to be considered weak
      return skill.attemptedQuestions > 0;
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

      // Calculate composite weak score (higher = weaker)
      // Priority: repeated mistakes > low accuracy > low mastery > low confidence
      let weakScore = 0;
      
      // Repeated mistakes: weight = 40%
      const mistakeFactor = Math.min(mistakeCount / 5, 1); // Normalize to 0-1
      weakScore += mistakeFactor * 0.4;
      
      // Low accuracy: weight = 30% (if accuracy < 70%)
      if (skill.accuracy < 0.7) {
        const accuracyFactor = (0.7 - skill.accuracy) / 0.7; // 0.7 accuracy = 0, 0 accuracy = 1
        weakScore += accuracyFactor * 0.3;
      }
      
      // Low mastery: weight = 20% (if mastery < 0.7)
      if (skill.mastery < 0.7) {
        const masteryFactor = (0.7 - skill.mastery) / 0.7;
        weakScore += masteryFactor * 0.2;
      }
      
      // Low confidence: weight = 10% (if confidence < 50% and available)
      if (avgConfidence !== undefined && avgConfidence < 50) {
        const confidenceFactor = (50 - avgConfidence) / 50;
        weakScore += confidenceFactor * 0.1;
      }

      // Special case: If user got a question wrong (accuracy = 0% with at least 1 attempt), 
      // always mark as weak even if weakScore is low
      const hasWrongAnswer = skill.attemptedQuestions > 0 && skill.correctQuestions === 0;

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
        weakScore: hasWrongAnswer && weakScore === 0 ? 0.5 : weakScore, // Ensure wrong answers always get flagged
        questionIds,
      };
    })
    .filter((skill) => {
      // Include skills with:
      // 1. weakScore > 0 (calculated weakness)
      // 2. OR any incorrect answers (accuracy < 100% with attempts)
      // 3. OR any unanswered questions for this skill
      const hasIncorrectAnswers = skill.attemptedQuestions > 0 && skill.accuracy < 1.0;
      const hasUnansweredForSkill = skill.questionIds.length > 0;
      return skill.weakScore > 0 || hasIncorrectAnswers || hasUnansweredForSkill;
    })
    .sort((a, b) => b.weakScore - a.weakScore); // Sort by weakScore descending (weakest first)

  return weakSkillsData;
}

/**
 * Detects strength skills (top performers)
 */
function detectStrengthSkills(skills: SkillStat[]): StrengthSkill[] {
  return skills
    .filter((skill) => skill.attemptedQuestions >= 3) // Need at least 3 attempts to be a strength
    .map((skill) => {
      // Calculate strength score (higher = stronger)
      const strengthScore = (skill.accuracy * 0.5) + (skill.mastery * 0.5);
      
      return {
        skill: skill.skill,
        accuracy: skill.accuracy,
        mastery: skill.mastery,
        strengthScore,
      };
    })
    .filter((skill) => skill.accuracy >= 0.8 && skill.mastery >= 0.7) // Only strong skills
    .sort((a, b) => b.strengthScore - a.strengthScore); // Sort by strengthScore descending
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

