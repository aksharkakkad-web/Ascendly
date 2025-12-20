// Database API wrapper
// Uses backend API, with localStorage fallback for compatibility

import { SkillMastery, StimulusPerformance, StimulusMeta } from "./questionData";
import { APTestAttempt } from "./apTestData";
import { 
  authApi, userApi, questionApi, quizApi, attemptApi, 
  leaderboardApi, classApi, apTestApi 
} from "./api";

export interface User {
  id: string;
  username: string;
  password: string; // In production, this would be hashed
  firstName: string;
  lastName: string;
  nickname?: string; // Optional anonymous nickname
  displayPreference: 'username' | 'realName' | 'nickname';
  role: 'student' | 'teacher';
  apClasses: string[];
  classScores: Record<string, number>; // Leaderboard scores (with decay applied)
  streak: number;
  createdAt: string;
  lastQuizDate?: string;
  lastDecayTimestamp?: string; // For leaderboard decay tracking
  dailyPoints?: Record<string, number>; // Date string -> points earned that day
  showLeaderboard?: boolean; // Student preference to show/hide leaderboard tab (default true - show)
  showRank?: boolean; // Student preference to display their own rank/place (default true - show)
  showRankPublicly?: boolean; // Student preference to allow others to see their rank on leaderboard (default true - show)
  trackConfidence?: boolean; // Student preference to track confidence (default true)
}

export interface QuestionAttempt {
  questionId: string; // Format: "CALCBC-U3-S1-Q01" or legacy "className:unitName:subtopicName:questionIndex"
  attempts: number;
  correctAttempts: number; // Total number of correct answers
  streak: number; // Current correct streak (resets on incorrect)
  lastAttemptTimestamp: number | null; // Unix timestamp of last attempt
  correctTimestamps: string[]; // Track when question was answered correctly (for mastery)
  // New enhanced tracking fields
  timeSpentSeconds: number; // Total time spent on this question across all attempts
  status: "unanswered" | "correct" | "incorrect"; // Current status
  isCorrect: boolean; // Whether the last attempt was correct
  answerEvents?: { timestamp: string; optionId: string; confidence?: number }[];
  confidence?: number | null;
  lastPracticedAt?: string | null;
  skillMasterySnapshot?: Record<string, SkillMastery>;
  stimulusPerformance?: StimulusPerformance;
}

export interface QuizProgress {
  apClass: string;
  unit: string;
  currentIndex: number;
  correctAnswers: number;
  answeredQuestions: number[]; // indices of answered questions
  pointsEarned: number; // points earned so far this session
  questionStartTime?: number; // Timestamp when current question started
  sessionCorrectAnswers: number; // For accuracy calculation
  sessionTotalAnswered: number; // For accuracy calculation
}

export interface QuizResult {
  userId: string;
  apClass: string;
  unit: string;
  score: number;
  totalQuestions: number;
  timestamp: string;
  pointsEarned?: number;
}

export interface Class {
  id: string;
  classCode: string; // Unique code for students to join
  teacherId: string; // ID of teacher who created this class
  apClassName: string; // AP class name (e.g., "AP Biology")
  studentIds: string[]; // IDs of students who joined this class
  createdAt: string;
  leaderboardEnabled?: boolean; // Teacher setting to enable/disable leaderboard (default true)
}

interface Database {
  users: User[];
  quizResults: QuizResult[];
  questionAttempts: Record<string, QuestionAttempt[]>; // userId -> attempts
  quizProgress: Record<string, QuizProgress | null>; // `${userId}:${apClass}:${unit}` -> progress
  classes: Class[]; // Teacher-created classes with codes
}

const DB_KEY = 'ascendly_db';
const SESSION_KEY = 'ascendly_session';

// Initialize or get database
export function getDatabase(): Database {
  const stored = localStorage.getItem(DB_KEY);
  if (stored) {
    const db = JSON.parse(stored);
    // Ensure new fields exist
    if (!db.questionAttempts) db.questionAttempts = {};
    if (!db.quizProgress) db.quizProgress = {};
    if (!db.classes) db.classes = [];
    if (!db.apTestAttempts) db.apTestAttempts = {};
    return db;
  }
  const initial: Database = { users: [], quizResults: [], questionAttempts: {}, quizProgress: {}, classes: [], apTestAttempts: {} };
  localStorage.setItem(DB_KEY, JSON.stringify(initial));
  return initial;
}

// Save database
function saveDatabase(db: Database): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Clear all database data
export function clearDatabase(): void {
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(SESSION_KEY);
  // Also clear any custom questions
  localStorage.removeItem('ascendly_custom_questions');
  console.log('Database cleared! Refresh the page.');
}

// Delete a user account and their quiz results
export async function deleteUserAccount(userId: string): Promise<{ success: boolean; message: string }> {
  // Try API first (Supabase)
  try {
    const result = await userApi.deleteAccount(userId);
    if (result.success) {
      // Also clear localStorage as fallback cleanup
      localStorage.removeItem(SESSION_KEY);
      return { success: true, message: result.message || 'Account deleted successfully' };
    }
  } catch (error: any) {
    console.warn('Failed to delete account via API, falling back to localStorage:', error);
    // Fall through to localStorage deletion
  }

  // Fallback to localStorage (legacy support)
  try {
    const db = getDatabase();
    db.users = db.users.filter(u => u.id !== userId);
    db.quizResults = db.quizResults.filter(r => r.userId !== userId);
    delete db.questionAttempts[userId];
    delete db.apTestAttempts[userId];
    // Remove quiz progress for this user
    Object.keys(db.quizProgress).forEach(key => {
      if (key.startsWith(userId + ':')) {
        delete db.quizProgress[key];
      }
    });
    saveDatabase(db);
    localStorage.removeItem(SESSION_KEY);
    return { success: true, message: 'Account deleted successfully (localStorage)' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to delete account' };
  }
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Generate random animal nickname (ensures uniqueness)
function generateRandomNickname(): string {
  const db = getDatabase();
  const animals = [
    'Lion', 'Tiger', 'Bear', 'Eagle', 'Wolf', 'Fox', 'Dolphin', 'Shark',
    'Hawk', 'Falcon', 'Panther', 'Jaguar', 'Leopard', 'Cheetah', 'Lynx',
    'Owl', 'Raven', 'Phoenix', 'Dragon', 'Griffin', 'Unicorn', 'Pegasus',
    'Elephant', 'Rhino', 'Hippo', 'Giraffe', 'Zebra', 'Panda', 'Koala',
    'Penguin', 'Seal', 'Whale', 'Octopus', 'Squid', 'Turtle', 'Snake',
    'Lizard', 'Gecko', 'Chameleon', 'Frog', 'Toad', 'Salamander', 'Newt'
  ];
  
  let attempts = 0;
  let nickname: string;
  let isUnique = false;
  
  // Try to generate a unique nickname (max 100 attempts)
  while (!isUnique && attempts < 100) {
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const number = Math.floor(Math.random() * 9999) + 1;
    nickname = `${animal}${number}`;
    
    // Check if nickname already exists
    const existingUser = db.users.find(u => u.nickname?.toLowerCase() === nickname.toLowerCase());
    if (!existingUser) {
      isUnique = true;
    }
    attempts++;
  }
  
  // If still not unique after 100 attempts, add timestamp
  if (!isUnique) {
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const timestamp = Date.now().toString().slice(-6);
    nickname = `${animal}${timestamp}`;
  }
  
  return nickname!;
}

// Check if username contains inappropriate content
function isUsernameInappropriate(username: string): boolean {
  const inappropriateWords = [
    'admin', 'administrator', 'moderator', 'mod', 'owner', 'root',
    'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'bastard',
    'nazi', 'hitler', 'kill', 'death', 'murder', 'suicide',
    'hate', 'racist', 'sex', 'porn', 'xxx', 'nude', 'naked'
  ];
  
  const lowerUsername = username.toLowerCase();
  return inappropriateWords.some(word => lowerUsername.includes(word));
}

// Register new user - now uses API, fallback to localStorage for compatibility
export async function registerUser(
  username: string,
  password: string,
  role: 'student' | 'teacher',
  apClasses: string[],
  firstName: string,
  lastName: string,
  nickname?: string
): Promise<{ success: boolean; message: string; user?: User }> {
  // Validate username for inappropriate content
  if (isUsernameInappropriate(username)) {
    return { success: false, message: 'Username contains inappropriate content. Please choose a different username.' };
  }

  try {
    const result = await authApi.register({
      username,
      password,
      role,
      apClasses,
      firstName,
      lastName,
      nickname
    });
    
    if (result.success && result.user) {
      const user: User = {
        id: result.user.id,
        username: result.user.username,
        password: '',
        firstName: result.user.first_name,
        lastName: result.user.last_name,
        nickname: result.user.nickname,
        displayPreference: result.user.display_preference,
        role: result.user.role,
        apClasses: result.user.apClasses || [],
        classScores: result.user.classScores || {},
        streak: result.user.streak || 0,
        createdAt: result.user.created_at,
        lastQuizDate: result.user.last_quiz_date,
        lastDecayTimestamp: result.user.last_decay_timestamp,
        dailyPoints: result.user.dailyPoints,
        showLeaderboard: result.user.show_leaderboard,
        showRank: result.user.show_rank,
        showRankPublicly: result.user.show_rank_publicly
      };
      return { success: true, message: result.message, user };
    }
    return { success: false, message: result.message };
  } catch (error: any) {
    // Fallback to localStorage for backwards compatibility
    const db = getDatabase();
    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Username already exists' };
    }
    let finalNickname = nickname;
    if (role === 'student' && !nickname) {
      finalNickname = generateRandomNickname();
    }
    const newUser: User = {
      id: generateId(),
      username,
      password,
      firstName,
      lastName,
      nickname: finalNickname || undefined,
      displayPreference: role === 'student' ? 'nickname' : 'realName',
      role,
      apClasses,
      classScores: apClasses.reduce((acc, c) => ({ ...acc, [c]: 0 }), {}),
      streak: 0,
      createdAt: new Date().toISOString(),
      showLeaderboard: role === 'student' ? true : undefined, // Default to true (show leaderboard)
      showRank: role === 'student' ? true : undefined, // Default to true (show own rank)
      showRankPublicly: role === 'student' ? true : undefined, // Default to true (show rank publicly)
    };
    db.users.push(newUser);
    saveDatabase(db);
    return { success: true, message: 'Registration successful', user: newUser };
  }
}

// Login user - now uses API, fallback to localStorage for compatibility
export async function loginUser(
  username: string,
  password: string
): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    const result = await authApi.login(username, password);
    if (result.success && result.user) {
      const user: User = {
        id: result.user.id,
        username: result.user.username,
        password: '',
        firstName: result.user.first_name,
        lastName: result.user.last_name,
        nickname: result.user.nickname,
        displayPreference: result.user.display_preference,
        role: result.user.role,
        apClasses: result.user.apClasses || [],
        classScores: result.user.classScores || {},
        streak: result.user.streak || 0,
        createdAt: result.user.created_at,
        lastQuizDate: result.user.last_quiz_date,
        lastDecayTimestamp: result.user.last_decay_timestamp,
        dailyPoints: result.user.dailyPoints,
        showLeaderboard: result.user.show_leaderboard,
        showRank: result.user.show_rank,
        showRankPublicly: result.user.show_rank_publicly
      };
      return { success: true, message: result.message, user };
    }
    return { success: false, message: result.message };
  } catch (error: any) {
    // Fallback to localStorage for backwards compatibility
    const db = getDatabase();
    const user = db.users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (!user) {
      return { success: false, message: error.message || 'Invalid username or password' };
    }
    const migratedUser = migrateUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(migratedUser));
    return { success: true, message: 'Login successful', user: migratedUser };
  }
}

// Migrate legacy user data
function migrateUser(user: any): User {
  if (user.apClass && !user.apClasses) {
    user.apClasses = [user.apClass];
    delete user.apClass;
  }
  if (!user.apClasses) {
    user.apClasses = [];
  }
  // Migrate old single score to classScores
  if (!user.classScores) {
    user.classScores = {};
    if (user.score && user.score > 0 && user.apClasses.length > 0) {
      user.classScores[user.apClasses[0]] = user.score;
    }
    for (const c of user.apClasses) {
      if (user.classScores[c] === undefined) {
        user.classScores[c] = 0;
      }
    }
  }
  delete user.score;
  
  // Add new profile fields if missing
  if (!user.firstName) user.firstName = '';
  if (!user.lastName) user.lastName = '';
  if (!user.displayPreference) {
    // Default based on role: students get nickname, teachers get realName
    user.displayPreference = user.role === 'student' ? 'nickname' : 'realName';
  }
  // Migrate 'username' display preference to 'nickname' for students, 'realName' for teachers
  if (user.displayPreference === 'username') {
    user.displayPreference = user.role === 'student' ? 'nickname' : 'realName';
  }
  
  // Auto-generate nickname for students if missing
  if (user.role === 'student' && !user.nickname) {
    user.nickname = generateRandomNickname();
  }
  
  // Set default leaderboard settings for students if missing
  if (user.role === 'student') {
    if (user.showLeaderboard === undefined) {
      user.showLeaderboard = true; // Show leaderboard by default
    }
    if (user.showRank === undefined) {
      user.showRank = true; // Show own rank by default
    }
    if (user.showRankPublicly === undefined) {
      user.showRankPublicly = true; // Show rank publicly by default
    }
  }
  
  // Set default showRank for students if missing
  if (user.role === 'student' && user.showRank === undefined) {
    user.showRank = true; // Show rank by default
  }
  
  return user as User;
}

// Get current session
export function getCurrentUser(): User | null {
  // Try API first, fallback to localStorage
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      // Try localStorage session as fallback
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        return migrateUser(JSON.parse(session));
      }
      return null;
    }
    // For now, return null - AuthContext handles fetching
    return null;
  } catch {
    // Fallback to localStorage
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    return migrateUser(JSON.parse(session));
  }
}

// Logout
export function logoutUser(): void {
  localStorage.removeItem(SESSION_KEY);
}

// Update user profile settings
export function updateUserProfile(
  userId: string, 
  updates: { 
    firstName?: string; 
    lastName?: string; 
    nickname?: string; 
    displayPreference?: 'username' | 'realName' | 'nickname';
    showLeaderboard?: boolean;
    showRank?: boolean;
    showRankPublicly?: boolean;
  }
): User | null {
  const db = getDatabase();
  const userIndex = db.users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) return null;

  const user = migrateUser(db.users[userIndex]);
  
  if (updates.firstName !== undefined) user.firstName = updates.firstName;
  if (updates.lastName !== undefined) user.lastName = updates.lastName;
  // Don't allow nickname changes for students - it's auto-generated and should remain unique
  if (updates.nickname !== undefined && user.role !== 'student') {
    user.nickname = updates.nickname;
  }
  if (updates.displayPreference !== undefined) {
    // Migrate 'username' to 'nickname' if needed
    if (updates.displayPreference === 'username') {
      user.displayPreference = 'nickname';
    } else {
      user.displayPreference = updates.displayPreference;
    }
  }
  if (updates.showLeaderboard !== undefined) user.showLeaderboard = updates.showLeaderboard;
  if (updates.showRank !== undefined) user.showRank = updates.showRank;
  if (updates.showRankPublicly !== undefined) user.showRankPublicly = updates.showRankPublicly;
  
  db.users[userIndex] = user;
  saveDatabase(db);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));

  return user;
}

// Get display name for leaderboard
export function getDisplayName(user: User): string {
  switch (user.displayPreference) {
    case 'realName':
      return `${user.firstName} ${user.lastName}`.trim() || user.username;
    case 'nickname':
      return user.nickname || user.username;
    case 'username':
    default:
      return user.username;
  }
}

// Question attempt tracking - now uses API
export async function getQuestionAttempts(userId: string, questionId: string): Promise<number> {
  try {
    const attempt = await attemptApi.getAttempt(userId, questionId);
    return attempt?.attempts || 0;
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    const userAttempts = db.questionAttempts[userId] || [];
    const attempt = userAttempts.find(a => a.questionId === questionId);
    return attempt?.attempts || 0;
  }
}

export async function getQuestionCorrectTimestamps(userId: string, questionId: string): Promise<string[]> {
  try {
    const attempt = await attemptApi.getAttempt(userId, questionId);
    if (!attempt) return [];
    // Extract correct timestamps from metadata if stored there, or from answer_events
    const metadata = attempt.metadata || {};
    const answerEvents = metadata.answer_events || [];
    // Filter correct attempts and extract timestamps
    // This may need adjustment based on how the API stores this
    return [];
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    const userAttempts = db.questionAttempts[userId] || [];
    const attempt = userAttempts.find(a => a.questionId === questionId);
    return attempt?.correctTimestamps || [];
  }
}

// Calculate struggle score (0-1) based on correctness and time spent
// Higher score = more struggle
function calculateStruggleScore(
  isCorrect: boolean,
  timeSpentSeconds: number,
  maxExpectedTime: number = 120 // Default 2 minutes
): number {
  // Base score: 0 if correct, 1 if incorrect
  const correctnessComponent = isCorrect ? 0 : 1;
  
  // Time component: normalized time spent (0-1, capped at 2x expected time)
  const normalizedTime = Math.min(timeSpentSeconds / maxExpectedTime, 2.0) / 2.0;
  
  // Weighted combination: 70% correctness, 30% time
  const struggleScore = correctnessComponent * 0.7 + normalizedTime * 0.3;
  
  // Ensure it's between 0 and 1
  return Math.max(0, Math.min(1, struggleScore));
}

export async function recordQuestionAttempt(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  timeSpentSeconds: number = 0,
  selectedOptionId?: string,
  confidence?: number | null,
  timestamp: string = new Date().toISOString(),
  stimulusMeta?: StimulusMeta | null
): Promise<number> {
  try {
    const result = await attemptApi.recordAttempt({
      userId,
      questionId,
      isCorrect,
      timeSpentSeconds,
      selectedOptionId,
      confidence,
      timestamp
    });
    
    // Even when using API, we need to store stimulus performance in localStorage
    // because the API doesn't handle stimulus metadata
    if (stimulusMeta?.hasStimulus) {
      const db = getDatabase();
      if (!db.questionAttempts[userId]) {
        db.questionAttempts[userId] = [];
      }
      const attemptIndex = db.questionAttempts[userId].findIndex(a => a.questionId === questionId);
      const struggleScore = calculateStruggleScore(isCorrect, timeSpentSeconds);
      
      if (attemptIndex === -1) {
        // Create new attempt entry for stimulus performance
        db.questionAttempts[userId].push({
          questionId,
          attempts: result.attemptNumber,
          correctAttempts: isCorrect ? 1 : 0,
          streak: isCorrect ? 1 : 0,
          lastAttemptTimestamp: Date.now(),
          correctTimestamps: isCorrect ? [timestamp] : [],
          timeSpentSeconds: timeSpentSeconds || 0,
          status: isCorrect ? "correct" : "incorrect",
          isCorrect: isCorrect,
          answerEvents: selectedOptionId ? [{ timestamp, optionId: selectedOptionId, confidence: confidence ?? undefined }] : [],
          confidence: confidence ?? null,
          lastPracticedAt: timestamp,
          stimulusPerformance: {
            attemptCount: 1,
            timeSpentSeconds: timeSpentSeconds || 0,
            wasCorrect: isCorrect,
            struggleScore,
          },
        });
      } else {
        // Update existing attempt with stimulus performance
        const attempt = db.questionAttempts[userId][attemptIndex];
        if (!attempt.stimulusPerformance) {
          attempt.stimulusPerformance = {
            attemptCount: 0,
            timeSpentSeconds: 0,
            wasCorrect: false,
            struggleScore: 0,
          };
        }
        attempt.stimulusPerformance.attemptCount += 1;
        attempt.stimulusPerformance.timeSpentSeconds += timeSpentSeconds || 0;
        attempt.stimulusPerformance.wasCorrect = isCorrect;
        attempt.stimulusPerformance.struggleScore = struggleScore;
      }
      saveDatabase(db);
    }
    
    return result.attemptNumber;
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    if (!db.questionAttempts[userId]) {
      db.questionAttempts[userId] = [];
    }
    const attemptIndex = db.questionAttempts[userId].findIndex(a => a.questionId === questionId);
    const now = Date.now();
    let newAttemptCount: number;
    
    // Calculate stimulus performance if question has stimulus
    let stimulusPerformance: StimulusPerformance | undefined;
    if (stimulusMeta?.hasStimulus) {
      const struggleScore = calculateStruggleScore(isCorrect, timeSpentSeconds);
      stimulusPerformance = {
        attemptCount: 1,
        timeSpentSeconds: timeSpentSeconds || 0,
        wasCorrect: isCorrect,
        struggleScore,
      };
    }
    
    if (attemptIndex === -1) {
      db.questionAttempts[userId].push({ 
        questionId, 
        attempts: 1, 
        correctAttempts: isCorrect ? 1 : 0,
        streak: isCorrect ? 1 : 0,
        lastAttemptTimestamp: now,
        correctTimestamps: isCorrect ? [timestamp] : [],
        timeSpentSeconds: timeSpentSeconds || 0,
        status: isCorrect ? "correct" : "incorrect",
        isCorrect: isCorrect,
        answerEvents: selectedOptionId ? [{ timestamp, optionId: selectedOptionId, confidence: confidence ?? undefined }] : [],
        confidence: confidence ?? null,
        lastPracticedAt: timestamp,
        stimulusPerformance,
      });
      newAttemptCount = 1;
    } else {
      const attempt = db.questionAttempts[userId][attemptIndex];
      attempt.attempts += 1;
      attempt.lastAttemptTimestamp = now;
      attempt.timeSpentSeconds = (attempt.timeSpentSeconds || 0) + timeSpentSeconds;
      attempt.status = isCorrect ? "correct" : "incorrect";
      attempt.isCorrect = isCorrect;
      attempt.lastPracticedAt = timestamp;
      attempt.answerEvents = attempt.answerEvents || [];
      if (selectedOptionId) {
        attempt.answerEvents.push({ timestamp, optionId: selectedOptionId, confidence: confidence ?? undefined });
      }
      if (confidence !== undefined) {
        attempt.confidence = confidence;
      }
      if (isCorrect) {
        attempt.correctAttempts += 1;
        attempt.streak += 1;
        if (!attempt.correctTimestamps) {
          attempt.correctTimestamps = [];
        }
        attempt.correctTimestamps.push(timestamp);
      } else {
        attempt.streak = 0;
      }
      
      // Update stimulus performance if question has stimulus
      if (stimulusMeta?.hasStimulus) {
        const struggleScore = calculateStruggleScore(isCorrect, timeSpentSeconds);
        if (!attempt.stimulusPerformance) {
          attempt.stimulusPerformance = {
            attemptCount: 0,
            timeSpentSeconds: 0,
            wasCorrect: false,
            struggleScore: 0,
          };
        }
        attempt.stimulusPerformance.attemptCount += 1;
        attempt.stimulusPerformance.timeSpentSeconds += timeSpentSeconds || 0;
        attempt.stimulusPerformance.wasCorrect = isCorrect;
        // Update struggle score (can be average or latest - using latest for now)
        attempt.stimulusPerformance.struggleScore = struggleScore;
      }
      
      newAttemptCount = attempt.attempts;
    }
    saveDatabase(db);
    return newAttemptCount;
  }
}

// Get analytics for a specific question
export function getQuestionAnalytics(userId: string, questionId: string): QuestionAttempt | null {
  const db = getDatabase();
  const userAttempts = db.questionAttempts[userId] || [];
  return userAttempts.find(a => a.questionId === questionId) || null;
}

// Get all analytics for a user - now uses API
export async function getAllQuestionAnalytics(userId: string): Promise<QuestionAttempt[]> {
  try {
    const attempts = await attemptApi.getAttempts(userId);
    if (!Array.isArray(attempts)) {
      console.error('getAllQuestionAnalytics: API returned non-array:', attempts);
      return [];
    }
    
    // Merge stimulusPerformance from localStorage since API doesn't return it
    const db = getDatabase();
    const localStorageAttempts = db.questionAttempts[userId] || [];
    const stimulusPerformanceMap = new Map<string, StimulusPerformance>();
    localStorageAttempts.forEach((localAttempt) => {
      if (localAttempt.stimulusPerformance) {
        stimulusPerformanceMap.set(localAttempt.questionId, localAttempt.stimulusPerformance);
      }
    });
    
    return attempts.map((a: any) => {
      const questionId = a.question_id || a.questionId;
      const stimulusPerformance = stimulusPerformanceMap.get(questionId);
      return {
        questionId, // Support both formats
        attempts: a.attempts || 0,
        correctAttempts: a.correct_attempts || a.correctAttempts || 0,
        streak: a.streak || 0,
        lastAttemptTimestamp: a.last_attempt_timestamp ? new Date(a.last_attempt_timestamp).getTime() : null,
        correctTimestamps: a.metadata?.correct_timestamps || a.correctTimestamps || [],
        timeSpentSeconds: a.time_spent_seconds || a.timeSpentSeconds || 0,
        status: a.status || 'unanswered',
        isCorrect: a.is_correct || a.isCorrect || false,
        answerEvents: a.metadata?.answer_events || a.answerEvents || [],
        confidence: a.confidence,
        lastPracticedAt: a.last_practiced_at || a.lastPracticedAt,
        skillMasterySnapshot: a.metadata?.skill_mastery_snapshot || a.skillMasterySnapshot,
        stimulusPerformance // Merge from localStorage
      };
    });
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    return db.questionAttempts[userId] || [];
  }
}

// Analytics aggregation interfaces
export interface SubtopicAnalytics {
  subtopicName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  totalAttempts: number;
  totalCorrectAttempts: number;
  averageAccuracy: number; // Percentage
  averageStreak: number;
}

export interface UnitAnalytics {
  unitName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  totalAttempts: number;
  totalCorrectAttempts: number;
  averageAccuracy: number; // Percentage
  subtopics: SubtopicAnalytics[];
}

export interface ClassAnalytics {
  className: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  totalAttempts: number;
  totalCorrectAttempts: number;
  averageAccuracy: number; // Percentage
  units: UnitAnalytics[];
}

// Get analytics for a subtopic
export async function getSubtopicAnalytics(
  userId: string,
  className: string,
  unitName: string,
  subtopicName: string
): Promise<SubtopicAnalytics | null> {
  const { getQuestionsForSubtopic } = await import('./jsonLoader');
  const questions = await getQuestionsForSubtopic(className, unitName, subtopicName);
  if (questions.length === 0) return null;

  const allAnalytics = await getAllQuestionAnalytics(userId);
  let attemptedCount = 0;
  let correctCount = 0;
  let totalAttempts = 0;
  let totalCorrectAttempts = 0;
  let totalStreak = 0;
  let streakCount = 0;

  for (const question of questions) {
    const analytics = allAnalytics.find(a => a.questionId === question.id);
    if (analytics) {
      attemptedCount++;
      totalAttempts += analytics.attempts;
      totalCorrectAttempts += analytics.correctAttempts;
      if (analytics.correctAttempts > 0) {
        correctCount++;
      }
      totalStreak += analytics.streak;
      streakCount++;
    }
  }

  const averageAccuracy = totalAttempts > 0 ? (totalCorrectAttempts / totalAttempts) * 100 : 0;
  const averageStreak = streakCount > 0 ? totalStreak / streakCount : 0;

  return {
    subtopicName,
    totalQuestions: questions.length,
    attemptedQuestions: attemptedCount,
    correctQuestions: correctCount,
    totalAttempts,
    totalCorrectAttempts,
    averageAccuracy,
    averageStreak,
  };
}

// Get analytics for a unit
export async function getUnitAnalytics(
  userId: string,
  className: string,
  unitName: string
): Promise<UnitAnalytics | null> {
  const { getSubtopicsForUnit, getQuestionsForSubtopic } = await import('./jsonLoader');
  const subtopicNames = await getSubtopicsForUnit(className, unitName);
  if (subtopicNames.length === 0) return null;

  const subtopics: SubtopicAnalytics[] = [];
  let totalQuestions = 0;
  let attemptedQuestions = 0;
  let correctQuestions = 0;
  let totalAttempts = 0;
  let totalCorrectAttempts = 0;

  for (const subtopicName of subtopicNames) {
    const subtopicAnalytics = await getSubtopicAnalytics(userId, className, unitName, subtopicName);
    if (subtopicAnalytics) {
      subtopics.push(subtopicAnalytics);
      totalQuestions += subtopicAnalytics.totalQuestions;
      attemptedQuestions += subtopicAnalytics.attemptedQuestions;
      correctQuestions += subtopicAnalytics.correctQuestions;
      totalAttempts += subtopicAnalytics.totalAttempts;
      totalCorrectAttempts += subtopicAnalytics.totalCorrectAttempts;
    }
  }

  const averageAccuracy = totalAttempts > 0 ? (totalCorrectAttempts / totalAttempts) * 100 : 0;

  return {
    unitName,
    totalQuestions,
    attemptedQuestions,
    correctQuestions,
    totalAttempts,
    totalCorrectAttempts,
    averageAccuracy,
    subtopics,
  };
}

// Get analytics for a class
export async function getClassAnalytics(
  userId: string,
  className: string
): Promise<ClassAnalytics | null> {
  const { getUnitsForClass } = await import('./jsonLoader');
  const unitNames = await getUnitsForClass(className);
  if (unitNames.length === 0) return null;

  const units: UnitAnalytics[] = [];
  let totalQuestions = 0;
  let attemptedQuestions = 0;
  let correctQuestions = 0;
  let totalAttempts = 0;
  let totalCorrectAttempts = 0;

  for (const unitName of unitNames) {
    const unitAnalytics = await getUnitAnalytics(userId, className, unitName);
    if (unitAnalytics) {
      units.push(unitAnalytics);
      totalQuestions += unitAnalytics.totalQuestions;
      attemptedQuestions += unitAnalytics.attemptedQuestions;
      correctQuestions += unitAnalytics.correctQuestions;
      totalAttempts += unitAnalytics.totalAttempts;
      totalCorrectAttempts += unitAnalytics.totalCorrectAttempts;
    }
  }

  const averageAccuracy = totalAttempts > 0 ? (totalCorrectAttempts / totalAttempts) * 100 : 0;

  return {
    className,
    totalQuestions,
    attemptedQuestions,
    correctQuestions,
    totalAttempts,
    totalCorrectAttempts,
    averageAccuracy,
    units,
  };
}

// Get analytics for all students in a class (for teacher view)
export async function getClassAggregatedAnalytics(
  className: string
): Promise<{ studentId: string; analytics: ClassAnalytics }[]> {
  const db = getDatabase();
  const students = db.users.filter(
    u => u.role === 'student' && u.apClasses && u.apClasses.includes(className)
  );

  const results: { studentId: string; analytics: ClassAnalytics }[] = [];
  for (const student of students) {
    const analytics = await getClassAnalytics(student.id, className);
    if (analytics) {
      results.push({ studentId: student.id, analytics });
    }
  }

  return results;
}

// Calculate points for an answer based on attempt number (legacy - use scoring.ts for full calculation)
export function calculatePointsForAttempt(attemptNumber: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  if (attemptNumber === 1) return 10; // Full points
  if (attemptNumber === 2) return 5;  // Half points
  return 0; // No points after 2nd attempt
}

// Daily points tracking
export function getDailyPointsEarned(userId: string): number {
  const db = getDatabase();
  const user = db.users.find(u => u.id === userId);
  if (!user || !user.dailyPoints) return 0;
  
  const today = new Date().toDateString();
  return user.dailyPoints[today] || 0;
}

export function addDailyPoints(userId: string, points: number): void {
  const db = getDatabase();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) return;
  
  const user = db.users[userIndex];
  if (!user.dailyPoints) user.dailyPoints = {};
  
  const today = new Date().toDateString();
  user.dailyPoints[today] = (user.dailyPoints[today] || 0) + points;
  
  db.users[userIndex] = user;
  saveDatabase(db);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

// Quiz progress tracking - now uses API
export async function getQuizProgress(userId: string, apClass: string, unit: string): Promise<QuizProgress | null> {
  try {
    const progress = await quizApi.getProgress(userId, apClass, unit);
    if (!progress) return null;
    return {
      apClass: progress.ap_class,
      unit: progress.unit,
      currentIndex: progress.current_index,
      correctAnswers: progress.correct_answers,
      answeredQuestions: progress.answered_questions || [],
      pointsEarned: progress.points_earned,
      sessionCorrectAnswers: progress.session_correct_answers,
      sessionTotalAnswered: progress.session_total_answered
    };
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    const key = `${userId}:${apClass}:${unit}`;
    return db.quizProgress[key] || null;
  }
}

export async function saveQuizProgress(userId: string, progress: QuizProgress): Promise<void> {
  try {
    await quizApi.saveProgress({ ...progress, userId });
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    const key = `${userId}:${progress.apClass}:${progress.unit}`;
    db.quizProgress[key] = progress;
    saveDatabase(db);
  }
}

export async function clearQuizProgress(userId: string, apClass: string, unit: string): Promise<void> {
  try {
    await quizApi.clearProgress(userId, apClass, unit);
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    const key = `${userId}:${apClass}:${unit}`;
    delete db.quizProgress[key];
    saveDatabase(db);
  }
}

// Update user score for a specific class with decay applied - now uses API
export async function updateScore(userId: string, pointsToAdd: number, apClass: string): Promise<User | null> {
  try {
    // Update score via API
    await userApi.updateScore(userId, pointsToAdd, apClass);
    // Refresh user to get updated scores (this will be called separately, but we still return the updated user structure)
    // For now, we'll just update the local state via refreshUser call in the component
    return null; // Component will refresh user separately
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    const userIndex = db.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return null;

    let user = migrateUser(db.users[userIndex]);
    const today = new Date().toDateString();
    const lastQuizDay = user.lastQuizDate ? new Date(user.lastQuizDate).toDateString() : null;

    // Update streak
    if (lastQuizDay) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastQuizDay === yesterday.toDateString()) {
        user.streak += 1;
      } else if (lastQuizDay !== today) {
        user.streak = 1;
      }
    } else {
      user.streak = 1;
    }

    // Apply decay before adding points
    if (user.lastDecayTimestamp && user.classScores[apClass]) {
      const lastDecay = new Date(user.lastDecayTimestamp).getTime();
      const now = Date.now();
      const daysSinceDecay = (now - lastDecay) / (24 * 60 * 60 * 1000);
      if (daysSinceDecay >= 1) {
        const dailyDecayRate = 0.02 / 7; // 2% per week
        const decayFactor = Math.pow(1 - dailyDecayRate, daysSinceDecay);
        user.classScores[apClass] = Math.round(user.classScores[apClass] * decayFactor);
      }
    }
    user.lastDecayTimestamp = new Date().toISOString();

    // Initialize class score if not exists
    if (!user.classScores[apClass]) {
      user.classScores[apClass] = 0;
    }
    user.classScores[apClass] += pointsToAdd;
    user.lastQuizDate = new Date().toISOString();
    
    db.users[userIndex] = user;
    saveDatabase(db);

    // Update session
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));

    return user;
  }
}

// Get user's current streak
export function getUserStreak(userId: string): number {
  const db = getDatabase();
  const user = db.users.find(u => u.id === userId);
  return user?.streak || 0;
}

// Save quiz result - now uses API
export async function saveQuizResult(result: Omit<QuizResult, 'timestamp'>): Promise<void> {
  try {
    await quizApi.saveResult(result);
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    db.quizResults.push({
      ...result,
      timestamp: new Date().toISOString(),
    });
    saveDatabase(db);
  }
}

// Get leaderboard for a specific class - now uses API
export async function getLeaderboard(apClass: string): Promise<User[]> {
  try {
    const leaderboard = await leaderboardApi.getLeaderboard(apClass);
    return leaderboard.map((u: any) => ({
      id: u.id,
      username: u.username,
      password: '',
      firstName: u.firstName || u.first_name,
      lastName: u.lastName || u.last_name,
      nickname: u.nickname,
      displayPreference: u.displayPreference || u.display_preference,
      role: u.role,
      apClasses: u.apClasses || [],
      classScores: u.classScores || {},
      streak: u.streak || 0,
      createdAt: u.createdAt || u.created_at,
      lastQuizDate: u.lastQuizDate || u.last_quiz_date,
      lastDecayTimestamp: u.lastDecayTimestamp || u.last_decay_timestamp,
      dailyPoints: u.dailyPoints,
      showLeaderboard: u.showLeaderboard ?? u.show_leaderboard,
      showRank: u.showRank ?? u.show_rank,
      showRankPublicly: u.showRankPublicly ?? u.show_rank_publicly
    }));
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    return db.users
      .map(u => migrateUser(u))
      .filter(u => u.role === 'student' && u.apClasses && u.apClasses.includes(apClass))
      .sort((a, b) => (b.classScores[apClass] || 0) - (a.classScores[apClass] || 0));
  }
}

// Helper to get user's score for a specific class
export function getClassScore(user: User, apClass: string): number {
  return user.classScores?.[apClass] || 0;
}

// Helper to get user's total score across all classes
export function getTotalScore(user: User): number {
  if (!user || !user.classScores) return 0;
  const scores = Object.values(user.classScores);
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => {
    const numScore = typeof score === 'number' ? score : 0;
    return sum + (isNaN(numScore) ? 0 : numScore);
  }, 0);
}

// Get all students in a class (for teacher roster)
export function getClassRoster(apClass: string): User[] {
  const db = getDatabase();
  return db.users
    .map(u => migrateUser(u))
    .filter(u => u.role === 'student' && u.apClasses && u.apClasses.includes(apClass))
    .sort((a, b) => a.username.localeCompare(b.username));
}

// Get user's quiz history - now uses API
export async function getUserQuizHistory(userId: string): Promise<QuizResult[]> {
  try {
    const results = await quizApi.getResults(userId);
    return results.map((r: any) => ({
      userId: r.user_id,
      apClass: r.ap_class,
      unit: r.unit,
      score: r.score,
      totalQuestions: r.total_questions,
      timestamp: r.timestamp,
      pointsEarned: r.points_earned
    }));
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    return db.quizResults
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

// Add a class to user
export function addClassToUser(userId: string, apClass: string): User | null {
  const db = getDatabase();
  const userIndex = db.users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) return null;

  const user = migrateUser(db.users[userIndex]);
  if (!user.apClasses.includes(apClass)) {
    user.apClasses.push(apClass);
    if (!user.classScores[apClass]) {
      user.classScores[apClass] = 0;
    }
    db.users[userIndex] = user;
    saveDatabase(db);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  return user;
}

// Remove a class from user
export function removeClassFromUser(userId: string, apClass: string): User | null {
  const db = getDatabase();
  const userIndex = db.users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) return null;

  const user = migrateUser(db.users[userIndex]);
  user.apClasses = user.apClasses.filter(c => c !== apClass);
  db.users[userIndex] = user;
  saveDatabase(db);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));

  return user;
}

// Generate a unique class code (6 characters, alphanumeric)
function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new class (for teachers)
export function createClass(teacherId: string, apClassName: string): { success: boolean; message: string; class?: Class; classCode?: string } {
  const db = getDatabase();
  
  // Verify teacher exists
  const teacher = db.users.find(u => u.id === teacherId && u.role === 'teacher');
  if (!teacher) {
    return { success: false, message: 'Teacher not found' };
  }

  // Generate unique class code
  let classCode: string;
  let attempts = 0;
  do {
    classCode = generateClassCode();
    attempts++;
    if (attempts > 100) {
      return { success: false, message: 'Failed to generate unique class code' };
    }
  } while (db.classes.find(c => c.classCode === classCode));

  const newClass: Class = {
    id: generateId(),
    classCode,
    teacherId,
    apClassName,
    studentIds: [],
    createdAt: new Date().toISOString(),
    leaderboardEnabled: true, // Enabled by default, teacher can disable
  };

  db.classes.push(newClass);
  saveDatabase(db);

  return { success: true, message: 'Class created successfully', class: newClass, classCode };
}

// Get class by code
export function getClassByCode(classCode: string): Class | null {
  const db = getDatabase();
  return db.classes.find(c => c.classCode === classCode) || null;
}

// Join a class using class code - now uses API
export async function joinClassByCode(userId: string, classCode: string): Promise<{ success: boolean; message: string; class?: Class }> {
  try {
    const result = await classApi.joinClass(classCode);
    if (result.success && result.class) {
      const classData: Class = {
        id: result.class.id,
        classCode: result.class.class_code,
        teacherId: result.class.teacher_id,
        apClassName: result.class.ap_class_name,
        studentIds: [], // Not returned by API
        createdAt: result.class.created_at,
        leaderboardEnabled: result.class.leaderboard_enabled
      };
      return { success: true, message: result.message, class: classData };
    }
    return result;
  } catch (error: any) {
    // Fallback to localStorage
    const db = getDatabase();
    const student = db.users.find(u => u.id === userId && u.role === 'student');
    if (!student) {
      return { success: false, message: 'Student not found' };
    }
    const classToJoin = db.classes.find(c => c.classCode === classCode);
    if (!classToJoin) {
      return { success: false, message: error.message || 'Invalid class code' };
    }
    if (classToJoin.studentIds.includes(userId)) {
      return { success: false, message: 'You are already in this class' };
    }
    classToJoin.studentIds.push(userId);
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const user = migrateUser(db.users[userIndex]);
      if (!user.apClasses.includes(classToJoin.apClassName)) {
        user.apClasses.push(classToJoin.apClassName);
        if (!user.classScores[classToJoin.apClassName]) {
          user.classScores[classToJoin.apClassName] = 0;
        }
        db.users[userIndex] = user;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      }
    }
    saveDatabase(db);
    return { success: true, message: 'Successfully joined class', class: classToJoin };
  }
}

// Get all classes for a teacher
export function getTeacherClasses(teacherId: string): Class[] {
  const db = getDatabase();
  return db.classes.filter(c => c.teacherId === teacherId);
}

// Get all students in a class (by class code)
export function getClassStudents(classCode: string): User[] {
  const db = getDatabase();
  const classData = db.classes.find(c => c.classCode === classCode);
  if (!classData) return [];
  
  return db.users
    .map(u => migrateUser(u))
    .filter(u => classData.studentIds.includes(u.id))
    .sort((a, b) => a.username.localeCompare(b.username));
}

// Get class code for a student's AP class (if they joined via class code)
export function getClassCodeForStudent(studentId: string, apClassName: string): string | null {
  const db = getDatabase();
  const classData = db.classes.find(c => 
    c.apClassName === apClassName && c.studentIds.includes(studentId)
  );
  return classData ? classData.classCode : null;
}

// Get all students in classes with the same class code (for class leaderboard)
export function getStudentsInSameClass(studentId: string, apClassName: string): User[] {
  const db = getDatabase();
  const classCode = getClassCodeForStudent(studentId, apClassName);
  if (!classCode) return [];
  
  return getClassStudents(classCode);
}

// Get all students in a teacher's classes (for a specific AP class)
export function getTeacherClassStudents(teacherId: string, apClassName: string): User[] {
  const db = getDatabase();
  const teacherClasses = db.classes.filter(c => 
    c.teacherId === teacherId && c.apClassName === apClassName
  );
  
  if (teacherClasses.length === 0) return [];
  
  // Get all unique student IDs from all of teacher's classes for this AP class
  const studentIds = new Set<string>();
  teacherClasses.forEach(c => {
    c.studentIds.forEach(id => studentIds.add(id));
  });
  
  return db.users
    .map(u => migrateUser(u))
    .filter(u => studentIds.has(u.id) && u.role === 'student')
    .sort((a, b) => a.username.localeCompare(b.username));
}

// Get leaderboard for teacher's class (only students who joined via class code)
export function getTeacherClassLeaderboard(teacherId: string, apClassName: string): User[] {
  const students = getTeacherClassStudents(teacherId, apClassName);
  return students
    .sort((a, b) => (b.classScores[apClassName] || 0) - (a.classScores[apClassName] || 0));
}

// Check if leaderboard is enabled for a class
export function isClassLeaderboardEnabled(classCode: string): boolean {
  const db = getDatabase();
  const classData = db.classes.find(c => c.classCode === classCode);
  return classData ? (classData.leaderboardEnabled !== false) : true; // Default to true if not set
}

// Update class leaderboard setting
export function updateClassLeaderboardSetting(classCode: string, enabled: boolean): Class | null {
  const db = getDatabase();
  const classIndex = db.classes.findIndex(c => c.classCode === classCode);
  
  if (classIndex === -1) return null;
  
  db.classes[classIndex].leaderboardEnabled = enabled;
  saveDatabase(db);
  
  return db.classes[classIndex];
}

// Get class by teacher and AP class name
export function getClassByTeacherAndSubject(teacherId: string, apClassName: string): Class | null {
  const db = getDatabase();
  return db.classes.find(c => c.teacherId === teacherId && c.apClassName === apClassName) || null;
}

// Save AP test attempt - now uses API
export async function saveAPTestAttempt(attempt: APTestAttempt): Promise<void> {
  try {
    await apTestApi.saveAttempt(attempt);
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    if (!db.apTestAttempts[attempt.userId]) {
      db.apTestAttempts[attempt.userId] = [];
    }
    db.apTestAttempts[attempt.userId].push(attempt);
    saveDatabase(db);
  }
}

// Get all AP test attempts for a user - now uses API
export async function getUserAPTestAttempts(userId: string): Promise<APTestAttempt[]> {
  try {
    const attempts = await apTestApi.getAttempts(userId);
    return attempts.map((a: any) => ({
      id: a.id,
      userId: a.user_id,
      apClass: a.ap_class,
      testId: a.test_id,
      startTimestamp: a.start_timestamp,
      endTimestamp: a.end_timestamp,
      totalTimeUsedSeconds: a.total_time_used_seconds,
      responses: a.responses,
      summary: a.summary
    }));
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    return (db.apTestAttempts[userId] || []).sort((a, b) => 
      new Date(b.startTimestamp).getTime() - new Date(a.startTimestamp).getTime()
    );
  }
}

// Get AP test attempts for a user filtered by class - now uses API
export async function getAPTestAttemptsByClass(userId: string, apClass: string): Promise<APTestAttempt[]> {
  try {
    const attempts = await apTestApi.getAttempts(userId, apClass);
    return attempts.map((a: any) => ({
      id: a.id,
      userId: a.user_id,
      apClass: a.ap_class,
      testId: a.test_id,
      startTimestamp: a.start_timestamp,
      endTimestamp: a.end_timestamp,
      totalTimeUsedSeconds: a.total_time_used_seconds,
      responses: a.responses,
      summary: a.summary
    }));
  } catch (error) {
    // Fallback to localStorage
    const db = getDatabase();
    return (db.apTestAttempts[userId] || [])
      .filter(attempt => attempt.apClass === apClass)
      .sort((a, b) => 
        new Date(b.startTimestamp).getTime() - new Date(a.startTimestamp).getTime()
      );
  }
}
