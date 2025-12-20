import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Save quiz result
router.post('/results', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId, apClass, unit, score, totalQuestions, pointsEarned } = req.body;
    
    console.log(`[QUIZ RESULTS] Received request - userId: ${userId}, apClass: ${apClass}, unit: ${unit}, pointsEarned: ${pointsEarned}`);

    // Verify user can only save their own results
    if (userId !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    const { data: result, error } = await supabaseAdmin
      .from('quiz_results')
      .insert({
        user_id: userId,
        ap_class: apClass,
        unit,
        score,
        total_questions: totalQuestions,
        points_earned: pointsEarned
      })
      .select()
      .single();

    if (error || !result) {
      console.error(`[QUIZ RESULTS] Failed to save quiz result:`, error);
      throw new AppError(400, `Failed to save quiz result: ${error?.message}`);
    }
    
    console.log(`[QUIZ RESULTS] Quiz result saved successfully - id: ${result.id}`);

    // Update user's class score if points were earned
    if (pointsEarned && pointsEarned > 0) {
      console.log(`[QUIZ RESULTS] Updating class score - userId: ${userId}, apClass: ${apClass}, pointsEarned: ${pointsEarned}`);
      
      // Get existing score
      const { data: existingScore, error: fetchScoreError } = await supabaseAdmin
        .from('user_class_scores')
        .select('score')
        .eq('user_id', userId)
        .eq('ap_class', apClass)
        .single();

      if (fetchScoreError && fetchScoreError.code !== 'PGRST116') {
        console.error('[QUIZ RESULTS] Error fetching existing score:', fetchScoreError);
      }

      const currentScore = existingScore?.score || 0;
      const newScore = currentScore + pointsEarned;
      
      console.log(`[QUIZ RESULTS] Score update - current: ${currentScore}, adding: ${pointsEarned}, new: ${newScore}`);

      // Update or insert score
      const { error: scoreError } = await supabaseAdmin
        .from('user_class_scores')
        .upsert({
          user_id: userId,
          ap_class: apClass,
          score: newScore,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,ap_class'
        });

      if (scoreError) {
        console.error('[QUIZ RESULTS] Failed to update class score:', scoreError);
        // Don't fail the request if score update fails, but log it
      } else {
        console.log(`[QUIZ RESULTS] Successfully updated class score to ${newScore}`);
      }

      // Update user's last_quiz_date and streak
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
          // New streak (gap or first quiz)
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
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Get user's quiz history
router.get('/results/:userId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user can only get their own results
    if (userId !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    const { apClass } = req.query;

    let query = supabaseAdmin
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (apClass) {
      query = query.eq('ap_class', apClass as string);
    }

    const { data: results, error } = await query;

    if (error) {
      throw new AppError(400, `Failed to fetch quiz results: ${error.message}`);
    }

    res.json(results || []);
  } catch (error) {
    next(error);
  }
});

// Save quiz progress
router.post('/progress', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const progress = req.body;

    // Verify user can only save their own progress
    if (progress.userId !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    const { data: existing } = await supabaseAdmin
      .from('quiz_progress')
      .select('id')
      .eq('user_id', progress.userId)
      .eq('ap_class', progress.apClass)
      .eq('unit', progress.unit)
      .single();

    let result;
    if (existing) {
      // Update existing progress
      const { data, error } = await supabaseAdmin
        .from('quiz_progress')
        .update({
          current_index: progress.currentIndex,
          correct_answers: progress.correctAnswers,
          answered_questions: progress.answeredQuestions || [],
          points_earned: progress.pointsEarned || 0,
          session_correct_answers: progress.sessionCorrectAnswers || 0,
          session_total_answered: progress.sessionTotalAnswered || 0
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error || !data) {
        throw new AppError(400, `Failed to update quiz progress: ${error?.message}`);
      }
      result = data;
    } else {
      // Insert new progress
      const { data, error } = await supabaseAdmin
        .from('quiz_progress')
        .insert({
          user_id: progress.userId,
          ap_class: progress.apClass,
          unit: progress.unit,
          current_index: progress.currentIndex,
          correct_answers: progress.correctAnswers,
          answered_questions: progress.answeredQuestions || [],
          points_earned: progress.pointsEarned || 0,
          session_correct_answers: progress.sessionCorrectAnswers || 0,
          session_total_answered: progress.sessionTotalAnswered || 0
        })
        .select()
        .single();

      if (error || !data) {
        throw new AppError(400, `Failed to save quiz progress: ${error?.message}`);
      }
      result = data;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get quiz progress
router.get('/progress/:userId/:apClass/:unit', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId, apClass, unit } = req.params;

    // Verify user can only get their own progress
    if (userId !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    const { data: progress, error } = await supabaseAdmin
      .from('quiz_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('ap_class', apClass)
      .eq('unit', unit)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No progress found
        return res.json(null);
      }
      throw new AppError(400, `Failed to fetch quiz progress: ${error.message}`);
    }

    res.json(progress);
  } catch (error) {
    next(error);
  }
});

// Clear quiz progress
router.delete('/progress/:userId/:apClass/:unit', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId, apClass, unit } = req.params;

    // Verify user can only delete their own progress
    if (userId !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    const { error } = await supabaseAdmin
      .from('quiz_progress')
      .delete()
      .eq('user_id', userId)
      .eq('ap_class', apClass)
      .eq('unit', unit);

    if (error) {
      throw new AppError(400, `Failed to clear quiz progress: ${error.message}`);
    }

    res.json({ success: true, message: 'Quiz progress cleared' });
  } catch (error) {
    next(error);
  }
});

export default router;

