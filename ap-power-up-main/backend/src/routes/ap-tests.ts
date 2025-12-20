import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get available AP tests for a class
router.get('/:apClass', async (req, res, next) => {
  try {
    const { apClass } = req.params;

    // Get distinct test IDs for this class
    const { data: tests, error } = await supabaseAdmin
      .from('ap_test_questions')
      .select('test_id')
      .eq('ap_class', apClass)
      .order('test_id', { ascending: true });

    if (error) {
      throw new AppError(400, `Failed to fetch AP tests: ${error.message}`);
    }

    // Get unique test IDs
    const uniqueTestIds = [...new Set(tests?.map(t => t.test_id) || [])];

    // Get question count for each test
    const testData = await Promise.all(
      uniqueTestIds.map(async (testId) => {
        const { count } = await supabaseAdmin
          .from('ap_test_questions')
          .select('*', { count: 'exact', head: true })
          .eq('test_id', testId)
          .eq('ap_class', apClass);

        return {
          test_id: testId,
          ap_class: apClass,
          question_count: count || 0
        };
      })
    );

    res.json(testData);
  } catch (error) {
    next(error);
  }
});

// Get AP test questions
router.get('/:apClass/:testId/questions', async (req, res, next) => {
  try {
    const { apClass, testId } = req.params;

    const { data: questions, error } = await supabaseAdmin
      .from('ap_test_questions')
      .select('*')
      .eq('ap_class', apClass)
      .eq('test_id', testId)
      .order('question_order', { ascending: true });

    if (error) {
      throw new AppError(400, `Failed to fetch AP test questions: ${error.message}`);
    }

    res.json(questions || []);
  } catch (error) {
    next(error);
  }
});

// Save AP test attempt
router.post('/attempts', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const attempt = req.body;

    // Verify user can only save their own attempts
    if (attempt.userId !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    const { data: savedAttempt, error } = await supabaseAdmin
      .from('ap_test_attempts')
      .insert({
        id: attempt.id,
        user_id: attempt.userId,
        ap_class: attempt.apClass,
        test_id: attempt.testId,
        start_timestamp: attempt.startTimestamp,
        end_timestamp: attempt.endTimestamp,
        total_time_used_seconds: attempt.totalTimeUsedSeconds,
        responses: attempt.responses,
        summary: attempt.summary
      })
      .select()
      .single();

    if (error || !savedAttempt) {
      throw new AppError(400, `Failed to save AP test attempt: ${error?.message}`);
    }

    res.status(201).json(savedAttempt);
  } catch (error) {
    next(error);
  }
});

// Get user's AP test attempts
router.get('/attempts/:userId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user can only get their own attempts
    if (userId !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    const { apClass } = req.query;

    let query = supabaseAdmin
      .from('ap_test_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('start_timestamp', { ascending: false });

    if (apClass) {
      query = query.eq('ap_class', apClass as string);
    }

    const { data: attempts, error } = await query;

    if (error) {
      throw new AppError(400, `Failed to fetch AP test attempts: ${error.message}`);
    }

    res.json(attempts || []);
  } catch (error) {
    next(error);
  }
});

export default router;

