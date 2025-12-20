import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Generate random animal nickname
function generateRandomNickname(): string {
  const animals = [
    'Lion', 'Tiger', 'Bear', 'Eagle', 'Wolf', 'Fox', 'Dolphin', 'Shark',
    'Hawk', 'Falcon', 'Panther', 'Jaguar', 'Leopard', 'Cheetah', 'Lynx',
    'Owl', 'Raven', 'Phoenix', 'Dragon', 'Griffin', 'Unicorn', 'Pegasus',
    'Elephant', 'Rhino', 'Hippo', 'Giraffe', 'Zebra', 'Panda', 'Koala',
    'Penguin', 'Seal', 'Whale', 'Octopus', 'Squid', 'Turtle', 'Snake',
    'Lizard', 'Gecko', 'Chameleon', 'Frog', 'Toad', 'Salamander', 'Newt'
  ];
  
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const number = Math.floor(Math.random() * 9999) + 1;
  return `${animal}${number}`;
}

// Register new user
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, role, apClasses, firstName, lastName, email } = req.body;

    // #region agent log
    const registrationEmail = email || `${username}@example.com`;
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:25',message:'Register entry',data:{username:username?.toLowerCase(),email:registrationEmail,hasEmail:!!email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,D,E'})}).catch(()=>{});
    // #endregion

    if (!username || !password || !role) {
      throw new AppError(400, 'Missing required fields');
    }

    // Check if username exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:40',message:'Username check result',data:{username:username?.toLowerCase(),usernameExists:!!existingUser},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    if (existingUser) {
      throw new AppError(400, 'Username already exists');
    }

    // #region agent log
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === registrationEmail);
    const emailExists = !!existingAuthUser;
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:45',message:'Email check before create',data:{email:registrationEmail,emailExistsInAuth:emailExists,authUsersCount:existingAuthUsers?.users?.length,orphanedAuthUserId:existingAuthUser?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion

    // If email exists in Auth but username doesn't exist in users table, it's an orphaned auth user
    // Delete it before creating a new account
    if (emailExists && existingAuthUser && !existingUser) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:59',message:'Cleaning up orphaned auth user',data:{orphanedAuthUserId:existingAuthUser.id,email:registrationEmail},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:64',message:'Orphaned auth user delete result',data:{orphanedAuthUserId:existingAuthUser.id,error:deleteError?.message,success:!deleteError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      if (deleteError) {
        console.warn(`Failed to delete orphaned auth user ${existingAuthUser.id}:`, deleteError);
        // Continue anyway - might still work if it was already deleted
      }
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: registrationEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        role
      }
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:76',message:'Auth create result',data:{email:registrationEmail,error:authError?.message,errorCode:authError?.status,success:!authError,userId:authData?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,E'})}).catch(()=>{});
    // #endregion

    if (authError || !authData.user) {
      throw new AppError(400, `Failed to create user: ${authError?.message}`);
    }

    const userId = authData.user.id;

    // Generate nickname for students
    let nickname: string | undefined;
    if (role === 'student') {
      // Ensure unique nickname
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 100) {
        nickname = generateRandomNickname();
        const { data: existingNickname } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('nickname', nickname)
          .single();
        
        if (!existingNickname) {
          isUnique = true;
        }
        attempts++;
      }
      if (!isUnique) {
        nickname = `${generateRandomNickname()}_${Date.now().toString().slice(-6)}`;
      }
    }

    // Create user profile
    // Build insert data
    const userInsertData: any = {
      id: userId,
      username: username.toLowerCase(),
      first_name: firstName || '',
      last_name: lastName || '',
      nickname,
      display_preference: role === 'student' ? 'nickname' : 'realName',
      role,
      streak: 0
    };

    // Conditionally add fields that might not exist in schema
    if (role === 'student') {
      userInsertData.show_leaderboard = true;
      userInsertData.show_rank = true;
      // Only include show_rank_publicly if column exists (will retry without it if needed)
      userInsertData.show_rank_publicly = true;
    }

    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert(userInsertData)
      .select()
      .single();

    // If error is about show_rank_publicly column not existing, retry without it
    if (userError && userError.message?.includes('show_rank_publicly')) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:143',message:'Retrying user insert without show_rank_publicly',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'schema'})}).catch(()=>{});
      // #endregion
      
      const retryData = { ...userInsertData };
      delete retryData.show_rank_publicly;
      
      const retryResult = await supabaseAdmin
        .from('users')
        .insert(retryData)
        .select()
        .single();
      
      user = retryResult.data;
      userError = retryResult.error;
    }

    if (userError || !user) {
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new AppError(400, `Failed to create user profile: ${userError?.message}`);
    }

    // Add AP classes
    if (apClasses && Array.isArray(apClasses) && apClasses.length > 0) {
      await supabaseAdmin
        .from('user_ap_classes')
        .insert(apClasses.map((apClass: string) => ({
          user_id: userId,
          ap_class: apClass
        })));

      // Initialize class scores
      await supabaseAdmin
        .from('user_class_scores')
        .insert(apClasses.map((apClass: string) => ({
          user_id: userId,
          ap_class: apClass,
          score: 0
        })));
    }

    // Get session token
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: email || `${username}@example.com`,
      password
    });

    if (sessionError || !sessionData.session) {
      // User created but session failed - still return user
      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: {
          ...user,
          apClasses: apClasses || []
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        ...user,
        apClasses: apClasses || []
      },
      token: sessionData.session.access_token
    });
  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError(400, 'Username and password required');
    }

    // Find user by username
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();

    if (userError || !userData) {
      throw new AppError(401, 'Invalid username or password');
    }

    // Get user's email from auth
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userData.id);
    if (!authUser.user?.email) {
      throw new AppError(401, 'User email not found');
    }

    // Sign in with email
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: authUser.user.email,
      password
    });

    if (sessionError || !sessionData.session) {
      throw new AppError(401, 'Invalid username or password');
    }

    // Get user's AP classes
    const { data: apClasses } = await supabaseAdmin
      .from('user_ap_classes')
      .select('ap_class')
      .eq('user_id', userData.id);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        ...userData,
        apClasses: apClasses?.map(c => c.ap_class) || []
      },
      token: sessionData.session.access_token
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error || !user) {
      throw new AppError(404, 'User not found');
    }

    // Get user's AP classes
    const { data: apClasses } = await supabaseAdmin
      .from('user_ap_classes')
      .select('ap_class')
      .eq('user_id', req.userId);

    // Get class scores
    const { data: classScores } = await supabaseAdmin
      .from('user_class_scores')
      .select('ap_class, score')
      .eq('user_id', req.userId);

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

// Logout (mainly client-side, but we can invalidate if needed)
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;

