import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get user by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Users can only get their own data (or admin can get any)
    if (id !== (req as AuthRequest).userId) {
      throw new AppError(403, 'Forbidden');
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      throw new AppError(404, 'User not found');
    }

    // Get user's AP classes
    const { data: apClasses } = await supabaseAdmin
      .from('user_ap_classes')
      .select('ap_class')
      .eq('user_id', id);

    // Get class scores
    const { data: classScores } = await supabaseAdmin
      .from('user_class_scores')
      .select('ap_class, score')
      .eq('user_id', id);

    const scores: Record<string, number> = {};
    classScores?.forEach(cs => {
      scores[cs.ap_class] = cs.score;
    });

    res.json({
      ...user,
      apClasses: apClasses?.map(c => c.ap_class) || [],
      classScores: scores
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Users can only update their own data
    if (id !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    // Build update object
    const updateData: any = {};
    if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
    if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
    if (updates.displayPreference !== undefined) {
      // Migrate 'username' to 'nickname' if needed
      updateData.display_preference = updates.displayPreference === 'username' 
        ? 'nickname' 
        : updates.displayPreference;
    }
    if (updates.showLeaderboard !== undefined) updateData.show_leaderboard = updates.showLeaderboard;
    if (updates.showRank !== undefined) updateData.show_rank = updates.showRank;
    if (updates.showRankPublicly !== undefined) updateData.show_rank_publicly = updates.showRankPublicly;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !user) {
      throw new AppError(400, `Failed to update user: ${error?.message}`);
    }

    // Handle AP classes update if provided
    if (updates.ap_classes !== undefined && Array.isArray(updates.ap_classes)) {
      // Get current classes
      const { data: currentClasses } = await supabaseAdmin
        .from('user_ap_classes')
        .select('ap_class')
        .eq('user_id', id);

      const currentClassSet = new Set(currentClasses?.map(c => c.ap_class) || []);
      const newClassSet = new Set(updates.ap_classes);

      // Find classes to add
      const toAdd = updates.ap_classes.filter(c => !currentClassSet.has(c));
      // Find classes to remove
      const toRemove = (currentClasses?.map(c => c.ap_class) || []).filter(c => !newClassSet.has(c));

      // Add new classes
      if (toAdd.length > 0) {
        await supabaseAdmin
          .from('user_ap_classes')
          .insert(toAdd.map(apClass => ({ user_id: id, ap_class: apClass })));

        // Initialize scores for new classes
        await supabaseAdmin
          .from('user_class_scores')
          .upsert(
            toAdd.map(apClass => ({
              user_id: id,
              ap_class: apClass,
              score: 0
            })),
            { onConflict: 'user_id,ap_class' }
          );
      }

      // Remove classes
      if (toRemove.length > 0) {
        await supabaseAdmin
          .from('user_ap_classes')
          .delete()
          .eq('user_id', id)
          .in('ap_class', toRemove);
      }
    }

    // Get updated AP classes
    const { data: apClasses } = await supabaseAdmin
      .from('user_ap_classes')
      .select('ap_class')
      .eq('user_id', id);

    // Get class scores
    const { data: classScores } = await supabaseAdmin
      .from('user_class_scores')
      .select('ap_class, score')
      .eq('user_id', id);

    const scores: Record<string, number> = {};
    classScores?.forEach(cs => {
      scores[cs.ap_class] = cs.score;
    });

    res.json({
      ...user,
      apClasses: apClasses?.map(c => c.ap_class) || [],
      classScores: scores
    });
  } catch (error) {
    next(error);
  }
});

// Update class score (incremental)
router.post('/:id/score', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { pointsToAdd, apClass } = req.body;

    // Verify user can only update their own score
    if (id !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    if (!pointsToAdd || pointsToAdd <= 0) {
      return res.json({ success: true, message: 'No points to add' });
    }

    if (!apClass) {
      throw new AppError(400, 'apClass is required');
    }

    // Get existing score
    const { data: existingScore, error: fetchScoreError } = await supabaseAdmin
      .from('user_class_scores')
      .select('score')
      .eq('user_id', id)
      .eq('ap_class', apClass)
      .single();

    if (fetchScoreError && fetchScoreError.code !== 'PGRST116') {
      console.error('[SCORE UPDATE] Error fetching existing score:', fetchScoreError);
    }

    const currentScore = existingScore?.score || 0;
    const newScore = currentScore + pointsToAdd;

    console.log(`[SCORE UPDATE] Adding ${pointsToAdd} points - userId: ${id}, apClass: ${apClass}, current: ${currentScore}, new: ${newScore}`);

    // Update or insert score
    const { error: scoreError } = await supabaseAdmin
      .from('user_class_scores')
      .upsert({
        user_id: id,
        ap_class: apClass,
        score: newScore,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,ap_class'
      });

    if (scoreError) {
      console.error('[SCORE UPDATE] Failed to update score:', scoreError);
      throw new AppError(400, `Failed to update score: ${scoreError.message}`);
    }

    console.log(`[SCORE UPDATE] Successfully updated score to ${newScore}`);
    res.json({ success: true, newScore });
  } catch (error) {
    next(error);
  }
});

// Add AP class to user
router.post('/:id/classes', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { apClass } = req.body;

    // Users can only add classes to their own account
    if (id !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    if (!apClass) {
      throw new AppError(400, 'apClass is required');
    }

    // Check if class already exists
    const { data: existingClass } = await supabaseAdmin
      .from('user_ap_classes')
      .select('ap_class')
      .eq('user_id', id)
      .eq('ap_class', apClass)
      .single();

    if (existingClass) {
      // Class already exists, just return success
      // Get updated user data
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      const { data: apClasses } = await supabaseAdmin
        .from('user_ap_classes')
        .select('ap_class')
        .eq('user_id', id);

      const { data: classScores } = await supabaseAdmin
        .from('user_class_scores')
        .select('ap_class, score')
        .eq('user_id', id);

      const scores: Record<string, number> = {};
      classScores?.forEach(cs => {
        scores[cs.ap_class] = cs.score;
      });

      return res.json({
        success: true,
        message: 'Class already exists',
        user: {
          ...user,
          apClasses: apClasses?.map(c => c.ap_class) || [],
          classScores: scores
        }
      });
    }

    // Insert new class
    const { error: insertError } = await supabaseAdmin
      .from('user_ap_classes')
      .insert({
        user_id: id,
        ap_class: apClass
      });

    if (insertError) {
      throw new AppError(400, `Failed to add class: ${insertError.message}`);
    }

    // Initialize class score if it doesn't exist
    const { data: existingScore } = await supabaseAdmin
      .from('user_class_scores')
      .select('score')
      .eq('user_id', id)
      .eq('ap_class', apClass)
      .single();

    if (!existingScore) {
      await supabaseAdmin
        .from('user_class_scores')
        .insert({
          user_id: id,
          ap_class: apClass,
          score: 0
        });
    }

    // Get updated user data
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    const { data: apClasses } = await supabaseAdmin
      .from('user_ap_classes')
      .select('ap_class')
      .eq('user_id', id);

    const { data: classScores } = await supabaseAdmin
      .from('user_class_scores')
      .select('ap_class, score')
      .eq('user_id', id);

    const scores: Record<string, number> = {};
    classScores?.forEach(cs => {
      scores[cs.ap_class] = cs.score;
    });

    res.json({
      success: true,
      message: 'Class added successfully',
      user: {
        ...user,
        apClasses: apClasses?.map(c => c.ap_class) || [],
        classScores: scores
      }
    });
  } catch (error) {
    next(error);
  }
});

// Remove AP class from user
router.delete('/:id/classes/:apClass', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id, apClass } = req.params;

    // Users can only remove classes from their own account
    if (id !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    const decodedApClass = decodeURIComponent(apClass);

    // Delete the class
    const { error: deleteError } = await supabaseAdmin
      .from('user_ap_classes')
      .delete()
      .eq('user_id', id)
      .eq('ap_class', decodedApClass);

    if (deleteError) {
      throw new AppError(400, `Failed to remove class: ${deleteError.message}`);
    }

    // Get updated user data
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    const { data: apClasses } = await supabaseAdmin
      .from('user_ap_classes')
      .select('ap_class')
      .eq('user_id', id);

    const { data: classScores } = await supabaseAdmin
      .from('user_class_scores')
      .select('ap_class, score')
      .eq('user_id', id);

    const scores: Record<string, number> = {};
    classScores?.forEach(cs => {
      scores[cs.ap_class] = cs.score;
    });

    res.json({
      success: true,
      message: 'Class removed successfully',
      user: {
        ...user,
        apClasses: apClasses?.map(c => c.ap_class) || [],
        classScores: scores
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete user account
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users.ts:167',message:'Delete account entry',data:{userId:id,requestUserId:req.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    // Users can only delete their own account
    if (id !== req.userId) {
      throw new AppError(403, 'Forbidden');
    }

    // #region agent log
    const { data: userBeforeDelete } = await supabaseAdmin.from('users').select('username,first_name,last_name').eq('id',id).single();
    const { data: authUserBeforeDelete } = await supabaseAdmin.auth.admin.getUserById(id);
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users.ts:177',message:'Before delete - user data',data:{userId:id,username:userBeforeDelete?.username,email:authUserBeforeDelete?.user?.email,userExists:!!userBeforeDelete,authUserExists:!!authUserBeforeDelete?.user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    // Delete user (this will cascade delete related records due to foreign keys)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users.ts:179',message:'After auth delete',data:{userId:id,error:error?.message,success:!error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (error) {
      throw new AppError(400, `Failed to delete user: ${error.message}`);
    }

    // #region agent log
    const { data: userAfterDelete } = await supabaseAdmin.from('users').select('id').eq('id',id).single();
    const { data: authUserAfterDelete } = await supabaseAdmin.auth.admin.getUserById(id).catch(()=>({data:null}));
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users.ts:186',message:'After delete - verify removal',data:{userId:id,userStillExists:!!userAfterDelete,authUserStillExists:!!authUserAfterDelete?.user,authUserEmail:authUserAfterDelete?.user?.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users.ts:190',message:'Delete error',data:{userId:req.params.id,error:(error as any)?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    next(error);
  }
});

export default router;

