import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get global leaderboard for a class
router.get('/:apClass', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { apClass } = req.params;
    const decodedClass = decodeURIComponent(apClass);
    console.log(`[LEADERBOARD] Fetching for class: "${decodedClass}" (encoded: "${apClass}")`);

    // Get all students in this class with their scores
    const { data: scores, error: scoresError } = await supabaseAdmin
      .from('user_class_scores')
      .select('user_id, score, ap_class')
      .eq('ap_class', decodedClass)
      .order('score', { ascending: false })
      .limit(100);

    console.log(`[LEADERBOARD] Query executed - found ${scores?.length || 0} scores for "${decodedClass}"`);
    if (scoresError) {
      console.error(`[LEADERBOARD] Query error:`, scoresError);
    }
    if (scores && scores.length > 0) {
      console.log(`[LEADERBOARD] Sample scores:`, scores.slice(0, 3).map(s => ({ userId: s.user_id, score: s.score, ap_class: s.ap_class })));
    }

    if (scoresError) {
      console.error('[LEADERBOARD] Error fetching scores:', scoresError);
      throw new AppError(400, `Failed to fetch leaderboard: ${scoresError.message}`);
    }

    // Get user details for each score
    const userIds = scores?.map(s => s.user_id) || [];
    if (userIds.length === 0) {
      console.log(`[LEADERBOARD] No scores found for class: ${apClass}`);
      return res.json([]);
    }

    // Try to select show_rank_publicly, but handle if column doesn't exist
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username, first_name, last_name, nickname, display_preference, streak, role, show_rank_publicly')
      .in('id', userIds)
      .eq('role', 'student');

    if (usersError) {
      // If error is about missing column, try without it
      if (usersError.message.includes('show_rank_publicly')) {
        const { data: usersRetry, error: retryError } = await supabaseAdmin
          .from('users')
          .select('id, username, first_name, last_name, nickname, display_preference, streak, role')
          .in('id', userIds)
          .eq('role', 'student');
        
        if (retryError) {
          throw new AppError(400, `Failed to fetch users: ${retryError.message}`);
        }
        
        // Use retry data and set show_rank_publicly to default
        const usersWithDefaults = usersRetry?.map(u => ({ ...u, show_rank_publicly: true })) || [];
        const leaderboard = scores
          ?.map(score => {
            const user = usersWithDefaults?.find(u => u.id === score.user_id);
            if (!user) return null;

            return {
              id: user.id,
              username: user.username,
              firstName: user.first_name,
              lastName: user.last_name,
              nickname: user.nickname,
              displayPreference: user.display_preference,
              streak: user.streak,
              showRankPublicly: true,
              classScores: {
                [decodedClass]: score.score
              }
            };
          })
          .filter(Boolean)
          .sort((a, b) => (b?.classScores[decodedClass] || 0) - (a?.classScores[decodedClass] || 0));
        
        return res.json(leaderboard);
      }
      throw new AppError(400, `Failed to fetch users: ${usersError.message}`);
    }

    // Add default show_rank_publicly if not present
    const usersWithDefaults = users?.map(u => ({ 
      ...u, 
      show_rank_publicly: u.show_rank_publicly ?? true 
    })) || [];

    // Combine scores with user data
    const leaderboard = scores
      ?.map(score => {
        const user = usersWithDefaults?.find(u => u.id === score.user_id);
        if (!user) return null;

        return {
          id: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          nickname: user.nickname,
          displayPreference: user.display_preference,
          streak: user.streak,
          showRankPublicly: user.show_rank_publicly ?? true,
          classScores: {
            [decodedClass]: score.score
          }
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.classScores[decodedClass] || 0) - (a?.classScores[decodedClass] || 0));

    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

// Get class-specific leaderboard (students who joined via class code)
router.get('/:apClass/class/:classCode', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { apClass, classCode } = req.params;
    const decodedApClass = decodeURIComponent(apClass);

    // Get class
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('id, leaderboard_enabled')
      .eq('class_code', classCode)
      .eq('ap_class_name', decodedApClass)
      .single();

    if (classError || !classData) {
      throw new AppError(404, 'Class not found');
    }

    if (!classData.leaderboard_enabled) {
      throw new AppError(403, 'Leaderboard is disabled for this class');
    }

    // Get students in this class
    const { data: classStudents, error: studentsError } = await supabaseAdmin
      .from('class_students')
      .select('student_id')
      .eq('class_id', classData.id);

    if (studentsError) {
      throw new AppError(400, `Failed to fetch class students: ${studentsError.message}`);
    }

    const studentIds = classStudents?.map(cs => cs.student_id) || [];
    if (studentIds.length === 0) {
      return res.json([]);
    }
    
    // Get scores for these students in this AP class
    const { data: scores, error: scoresError } = await supabaseAdmin
      .from('user_class_scores')
      .select('user_id, score')
      .eq('ap_class', decodedApClass)
      .in('user_id', studentIds)
      .order('score', { ascending: false });

    if (scoresError) {
      throw new AppError(400, `Failed to fetch scores: ${scoresError.message}`);
    }

    // Get user details - handle missing show_rank_publicly column
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username, first_name, last_name, nickname, display_preference, streak, show_rank_publicly')
      .in('id', studentIds)
      .eq('role', 'student');

    if (usersError) {
      // If error is about missing column, try without it
      if (usersError.message.includes('show_rank_publicly')) {
        const { data: usersRetry, error: retryError } = await supabaseAdmin
          .from('users')
          .select('id, username, first_name, last_name, nickname, display_preference, streak')
          .in('id', studentIds)
          .eq('role', 'student');
        
        if (retryError) {
          throw new AppError(400, `Failed to fetch users: ${retryError.message}`);
        }
        
        // Use retry data and set show_rank_publicly to default
        const usersWithDefaults = usersRetry?.map(u => ({ ...u, show_rank_publicly: true })) || [];
        const leaderboard = scores
          ?.map(score => {
            const user = usersWithDefaults?.find(u => u.id === score.user_id);
            if (!user) return null;

            return {
              id: user.id,
              username: user.username,
              firstName: user.first_name,
              lastName: user.last_name,
              nickname: user.nickname,
              displayPreference: user.display_preference,
              streak: user.streak,
              showRankPublicly: true,
              classScores: {
                [decodedApClass]: score.score
              }
            };
          })
          .filter(Boolean)
          .sort((a, b) => (b?.classScores[decodedApClass] || 0) - (a?.classScores[decodedApClass] || 0));
        
        return res.json(leaderboard);
      }
      throw new AppError(400, `Failed to fetch users: ${usersError.message}`);
    }

    // Add default show_rank_publicly if not present
    const usersWithDefaults = users?.map(u => ({ 
      ...u, 
      show_rank_publicly: u.show_rank_publicly ?? true 
    })) || [];

    // Combine scores with user data
    const leaderboard = scores
      ?.map(score => {
        const user = usersWithDefaults?.find(u => u.id === score.user_id);
        if (!user) return null;

        return {
          id: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          nickname: user.nickname,
          displayPreference: user.display_preference,
          streak: user.streak,
          showRankPublicly: user.show_rank_publicly ?? true,
          classScores: {
            [decodedApClass]: score.score
          }
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.classScores[decodedApClass] || 0) - (a?.classScores[decodedApClass] || 0));

    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

export default router;
