import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Generate unique class code
function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create class (teacher only)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Verify user is a teacher
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', req.userId)
      .single();

    if (user?.role !== 'teacher') {
      throw new AppError(403, 'Only teachers can create classes');
    }

    const { apClassName } = req.body;

    if (!apClassName) {
      throw new AppError(400, 'AP class name is required');
    }

    // Generate unique class code
    let classCode: string;
    let attempts = 0;
    let isUnique = false;

    while (!isUnique && attempts < 100) {
      classCode = generateClassCode();
      const { data: existing } = await supabaseAdmin
        .from('classes')
        .select('id')
        .eq('class_code', classCode)
        .single();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new AppError(500, 'Failed to generate unique class code');
    }

    const { data: newClass, error } = await supabaseAdmin
      .from('classes')
      .insert({
        class_code: classCode!,
        teacher_id: req.userId,
        ap_class_name: apClassName,
        leaderboard_enabled: true
      })
      .select()
      .single();

    if (error || !newClass) {
      throw new AppError(400, `Failed to create class: ${error?.message}`);
    }

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      class: newClass,
      classCode: classCode
    });
  } catch (error) {
    next(error);
  }
});

// Get class by code
router.get('/:code', authenticate, async (req, res, next) => {
  try {
    const { code } = req.params;

    const { data: classData, error } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('class_code', code)
      .single();

    if (error || !classData) {
      throw new AppError(404, 'Class not found');
    }

    res.json(classData);
  } catch (error) {
    next(error);
  }
});

// Join class by code
router.post('/:code/join', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.params;

    // Verify user is a student
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', req.userId)
      .single();

    if (user?.role !== 'student') {
      throw new AppError(403, 'Only students can join classes');
    }

    // Get class
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('class_code', code)
      .single();

    if (classError || !classData) {
      throw new AppError(404, 'Invalid class code');
    }

    // Check if already joined
    const { data: existing } = await supabaseAdmin
      .from('class_students')
      .select('student_id')
      .eq('class_id', classData.id)
      .eq('student_id', req.userId)
      .single();

    if (existing) {
      throw new AppError(400, 'You are already in this class');
    }

    // Add student to class
    const { error: joinError } = await supabaseAdmin
      .from('class_students')
      .insert({
        class_id: classData.id,
        student_id: req.userId
      });

    if (joinError) {
      throw new AppError(400, `Failed to join class: ${joinError.message}`);
    }

    // Add AP class to student if not already there
    const { data: existingApClass } = await supabaseAdmin
      .from('user_ap_classes')
      .select('ap_class')
      .eq('user_id', req.userId)
      .eq('ap_class', classData.ap_class_name)
      .single();

    if (!existingApClass) {
      await supabaseAdmin
        .from('user_ap_classes')
        .insert({
          user_id: req.userId,
          ap_class: classData.ap_class_name
        });

      // Initialize class score
      await supabaseAdmin
        .from('user_class_scores')
        .insert({
          user_id: req.userId,
          ap_class: classData.ap_class_name,
          score: 0
        });
    }

    res.json({
      success: true,
      message: 'Successfully joined class',
      class: classData
    });
  } catch (error) {
    next(error);
  }
});

// Get teacher's classes
router.get('/teacher/:teacherId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { teacherId } = req.params;

    // Verify user is requesting their own classes or is a teacher
    if (teacherId !== req.userId) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', req.userId)
        .single();

      if (user?.role !== 'teacher') {
        throw new AppError(403, 'Forbidden');
      }
    }

    const { data: classes, error } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(400, `Failed to fetch classes: ${error.message}`);
    }

    res.json(classes || []);
  } catch (error) {
    next(error);
  }
});

export default router;

