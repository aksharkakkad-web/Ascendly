// AP Test Analytics Calculations
// Helper functions to calculate analytics from AP test responses

import { APTestQuestionResponse, APTestAttempt, calculatePredictedAPScore } from './apTestData';

export function calculateAPTestSummary(
  responses: APTestQuestionResponse[],
  startTime: number,
  endTime: number
): APTestAttempt['summary'] {
  const totalQuestions = responses.length;
  const correctAnswers = responses.filter(r => r.isCorrect).length;
  const incorrectAnswers = responses.filter(r => !r.isCorrect && r.userAnswer !== null).length;
  const unansweredQuestions = responses.filter(r => r.userAnswer === null).length;
  const overallAccuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

  // Calculate accuracy by skill type
  const accuracyBySkillType: Record<string, { correct: number; total: number; accuracy: number }> = {};
  responses.forEach(response => {
    if (!accuracyBySkillType[response.skillType]) {
      accuracyBySkillType[response.skillType] = { correct: 0, total: 0, accuracy: 0 };
    }
    accuracyBySkillType[response.skillType].total++;
    if (response.isCorrect) {
      accuracyBySkillType[response.skillType].correct++;
    }
  });
  Object.keys(accuracyBySkillType).forEach(skillType => {
    const data = accuracyBySkillType[skillType];
    data.accuracy = data.total > 0 ? data.correct / data.total : 0;
  });

  // Calculate accuracy by tag
  const accuracyByTag: Record<string, { correct: number; total: number; accuracy: number }> = {};
  responses.forEach(response => {
    response.tags.forEach(tag => {
      if (!accuracyByTag[tag]) {
        accuracyByTag[tag] = { correct: 0, total: 0, accuracy: 0 };
      }
      accuracyByTag[tag].total++;
      if (response.isCorrect) {
        accuracyByTag[tag].correct++;
      }
    });
  });
  Object.keys(accuracyByTag).forEach(tag => {
    const data = accuracyByTag[tag];
    data.accuracy = data.total > 0 ? data.correct / data.total : 0;
  });

  // Time management analysis
  const totalEstimatedTime = responses.reduce((sum, r) => sum + r.estimatedTimeSeconds, 0);
  const totalActualTime = responses.reduce((sum, r) => sum + r.timeSpentSeconds, 0);
  const averageTimePerQuestion = totalQuestions > 0 ? totalActualTime / totalQuestions : 0;
  const questionsOverTime = responses.filter(r => r.timeSpentSeconds > r.estimatedTimeSeconds).length;
  const questionsUnderTime = responses.filter(r => r.timeSpentSeconds < r.estimatedTimeSeconds).length;

  const predictedAPScore = calculatePredictedAPScore(overallAccuracy);

  return {
    totalQuestions,
    correctAnswers,
    incorrectAnswers,
    unansweredQuestions,
    overallAccuracy,
    accuracyBySkillType,
    accuracyByTag,
    timeManagement: {
      totalEstimatedTime,
      totalActualTime,
      averageTimePerQuestion,
      questionsOverTime,
      questionsUnderTime,
    },
    predictedAPScore,
  };
}
