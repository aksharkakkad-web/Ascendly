import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Record question attempt
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const {
      userId,
      questionId,
      isCorrect,
      timeSpentSeconds,
      selectedOptionId,
      confidence,
      timestamp
    } = req.body;

    // Verify user can only record their own attempts
    if (userId !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    // Get existing attempt
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('question_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .single();
    
    // Log for debugging
    console.log(`[ATTEMPTS] Recording attempt - userId: ${userId}, questionId: ${questionId}, existing: ${existing ? 'yes' : 'no'}, fetchError: ${fetchError?.code || 'none'}`);

    const now = Date.now();
    const attemptTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    // Round time_spent_seconds to integer (database column is INTEGER)
    const roundedTimeSpent = Math.round(timeSpentSeconds || 0);

    let result;
    if (existing) {
      // Update existing attempt
      const newAttempts = existing.attempts + 1;
      const newCorrectAttempts = isCorrect 
        ? existing.correct_attempts + 1 
        : existing.correct_attempts;
      const newStreak = isCorrect 
        ? existing.streak + 1 
        : 0;

      // Update metadata (answer events)
      const metadata = existing.metadata || {};
      const answerEvents = metadata.answer_events || [];
      answerEvents.push({
        timestamp: attemptTimestamp,
        optionId: selectedOptionId,
        confidence: confidence ?? undefined
      });

      const { data, error } = await supabaseAdmin
        .from('question_attempts')
        .update({
          attempts: newAttempts,
          correct_attempts: newCorrectAttempts,
          streak: newStreak,
          last_attempt_timestamp: now,
          time_spent_seconds: (existing.time_spent_seconds || 0) + roundedTimeSpent,
          status: isCorrect ? 'correct' : 'incorrect',
          is_correct: isCorrect,
          confidence: confidence ?? null,
          last_practiced_at: attemptTimestamp,
          metadata: {
            ...metadata,
            answer_events: answerEvents
          }
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error || !data) {
        console.error(`[ATTEMPTS] Failed to update attempt:`, error);
        throw new AppError(400, `Failed to update question attempt: ${error?.message}`);
      }
      result = data;
      console.log(`[ATTEMPTS] Successfully updated attempt - userId: ${userId}, questionId: ${questionId}, attempts: ${result.attempts}`);
    } else {
      // Create new attempt
      const { data, error } = await supabaseAdmin
        .from('question_attempts')
        .insert({
          user_id: userId,
          question_id: questionId,
          attempts: 1,
          correct_attempts: isCorrect ? 1 : 0,
          streak: isCorrect ? 1 : 0,
          last_attempt_timestamp: now,
          time_spent_seconds: roundedTimeSpent,
          status: isCorrect ? 'correct' : 'incorrect',
          is_correct: isCorrect,
          confidence: confidence ?? null,
          last_practiced_at: attemptTimestamp,
          metadata: {
            answer_events: selectedOptionId ? [{
              timestamp: attemptTimestamp,
              optionId: selectedOptionId,
              confidence: confidence ?? undefined
            }] : []
          }
        })
        .select()
        .single();

      if (error || !data) {
        console.error(`[ATTEMPTS] Failed to record new attempt:`, error);
        throw new AppError(400, `Failed to record question attempt: ${error?.message}`);
      }
      result = data;
      console.log(`[ATTEMPTS] Successfully recorded new attempt - userId: ${userId}, questionId: ${questionId}, attempts: ${result.attempts}`);
    }

    // After recording an attempt, update the user's DAILY streak based on answering any question
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('last_quiz_date, streak')
      .eq('id', userId)
      .single();

    if (user) {
      const today = new Date().toDateString();
      const lastQuizDay = user.last_quiz_date ? new Date(user.last_quiz_date).toDateString() : null;
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

      let newStreak = user.streak || 0;
      if (lastQuizDay === yesterday) {
        // Continuing streak
        newStreak += 1;
      } else if (lastQuizDay !== today) {
        // New streak (gap or first question of the day)
        newStreak = 1;
      }
      await supabaseAdmin
        .from('users')
        .update({
          last_quiz_date: new Date().toISOString(),
          streak: newStreak
        })
        .eq('id', userId);
    }

    res.json({
      attemptNumber: result.attempts,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

// Get all attempts for user
router.get('/:userId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user can only get their own attempts
    if (userId !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    const { questionId } = req.query;

    let query = supabaseAdmin
      .from('question_attempts')
      .select('*')
      .eq('user_id', userId);

    if (questionId) {
      query = query.eq('question_id', questionId as string);
    }

    const { data: attempts, error } = await query;

    if (error) {
      throw new AppError(400, `Failed to fetch question attempts: ${error.message}`);
    }

    // Log for debugging
    console.log(`[ATTEMPTS] Fetching attempts - userId: ${userId}, found: ${attempts?.length || 0} attempts`);

    res.json(attempts || []);
  } catch (error) {
    next(error);
  }
});

// Get attempts for specific question
router.get('/:userId/:questionId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId, questionId } = req.params;

    // Verify user can only get their own attempts
    if (userId !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    const { data: attempt, error } = await supabaseAdmin
      .from('question_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No attempt found
        return res.json(null);
      }
      throw new AppError(400, `Failed to fetch question attempt: ${error.message}`);
    }

    res.json(attempt);
  } catch (error) {
    next(error);
  }
});

export default router;

