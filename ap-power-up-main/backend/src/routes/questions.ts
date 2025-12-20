import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get questions with filters
router.get('/', async (req, res, next) => {
  try {
    const { apClass, unit, subtopic } = req.query;

    let query = supabaseAdmin
      .from('questions')
      .select('*');

    if (apClass) {
      query = query.eq('ap_class', apClass as string);
    }

    if (unit) {
      query = query.eq('unit_name', unit as string);
    }

    if (subtopic) {
      query = query.eq('subtopic_name', subtopic as string);
    }

    const { data: questions, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throw new AppError(400, `Failed to fetch questions: ${error.message}`);
    }

    res.json(questions || []);
  } catch (error) {
    next(error);
  }
});

// Get question by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !question) {
      throw new AppError(404, 'Question not found');
    }

    res.json(question);
  } catch (error) {
    next(error);
  }
});

// Create question (admin only)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check if user is admin/teacher
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', req.userId)
      .single();

    if (user?.role !== 'teacher') {
      throw new AppError(403, 'Only teachers can create questions');
    }

    const questionData = req.body;

    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .insert({
        question_text: questionData.questionText || questionData.question_text,
        options: questionData.options,
        correct_answer_id: questionData.correctAnswerId || questionData.correctOptionId || questionData.correct_answer_id || '',
        explanation: questionData.explanation,
        ap_class: questionData.apClass || questionData.ap_class,
        unit_name: questionData.unitName || questionData.unit_name,
        subtopic_name: questionData.subtopicName || questionData.subtopic_name,
        metadata: questionData.metadata || {}
      })
      .select()
      .single();

    if (error || !question) {
      throw new AppError(400, `Failed to create question: ${error?.message}`);
    }

    res.status(201).json(question);
  } catch (error) {
    next(error);
  }
});

// Update question (admin only)
router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check if user is admin/teacher
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', req.userId)
      .single();

    if (user?.role !== 'teacher') {
      throw new AppError(403, 'Only teachers can update questions');
    }

    const { id } = req.params;
    const updates = req.body;

    const updateData: any = {};
    if (updates.questionText !== undefined) updateData.question_text = updates.questionText;
    if (updates.question_text !== undefined) updateData.question_text = updates.question_text;
    if (updates.options !== undefined) updateData.options = updates.options;
    if (updates.correctAnswerId !== undefined) updateData.correct_answer_id = updates.correctAnswerId;
    if (updates.correctOptionId !== undefined) updateData.correct_answer_id = updates.correctOptionId;
    if (updates.correct_answer_id !== undefined) updateData.correct_answer_id = updates.correct_answer_id;
    if (updates.explanation !== undefined) updateData.explanation = updates.explanation;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !question) {
      throw new AppError(400, `Failed to update question: ${error?.message}`);
    }

    res.json(question);
  } catch (error) {
    next(error);
  }
});

// Bulk import questions from JSON
router.post('/import', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check if user is admin/teacher
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', req.userId)
      .single();

    if (user?.role !== 'teacher') {
      throw new AppError(403, 'Only teachers can import questions');
    }

    const { questions: questionsData } = req.body;

    if (!Array.isArray(questionsData)) {
      throw new AppError(400, 'Questions must be an array');
    }

    // Transform and insert questions
    const questionsToInsert = questionsData.map((q: any) => ({
      question_text: q.questionText || q.question_text || q.question,
      options: Array.isArray(q.options) 
        ? q.options.map((opt: any, idx: number) => {
            if (typeof opt === 'string') {
              return {
                id: String.fromCharCode(65 + idx),
                content: opt
              };
            }
            return {
              id: opt.id || String.fromCharCode(65 + idx),
              content: opt.content || opt
            };
          })
        : q.options,
      correct_answer_id: q.correctAnswerId || q.correctOptionId || q.correct_answer_id || q.answer || q.correctAnswer || '',
      explanation: q.explanation || '',
      ap_class: q.apClass || q.ap_class,
      unit_name: q.unitName || q.unit_name || q.unit,
      subtopic_name: q.subtopicName || q.subtopic_name || q.subtopic || null,
      metadata: q.metadata || {}
    }));

    const { data: inserted, error } = await supabaseAdmin
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (error) {
      throw new AppError(400, `Failed to import questions: ${error.message}`);
    }

    res.status(201).json({
      success: true,
      message: `Imported ${inserted?.length || 0} questions`,
      count: inserted?.length || 0,
      questions: inserted
    });
  } catch (error) {
    next(error);
  }
});

export default router;

