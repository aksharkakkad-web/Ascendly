# Migration Guide: localStorage to Supabase

This guide explains how to migrate from localStorage to Supabase database.

## Overview

The application has been updated to support both localStorage (legacy) and Supabase (new) backends. Functions in `src/lib/database.ts` now automatically use the API when available, with localStorage as a fallback.

## Setup Steps

### 1. Set Up Supabase

1. Create a new project at https://supabase.com
2. Copy the contents of `backend/src/migrations/001_create_schema.sql`
3. Run it in the Supabase SQL editor
4. Note your project URL and service role key

### 2. Set Up Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Add your Supabase credentials to `.env`:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

5. Start the backend server:
```bash
npm run dev
```

### 3. Configure Frontend

1. Create `.env.local` in the project root:
```
VITE_API_URL=http://localhost:3001/api
```

2. Restart the development server if running

### 4. Import Data

#### Import Questions

1. Import practice questions:
```bash
cd backend
tsx src/migrations/003_import_questions.ts ../public/data
```

2. Import AP test questions:
```bash
tsx src/migrations/004_import_ap_test_questions.ts ../public/data/ap-tests
```

#### Import Users (Optional)

1. Export localStorage data:
   - Open the app in browser
   - Open browser console
   - Copy and run the script from `backend/src/migrations/export-localStorage.js`
   - Save the downloaded JSON file

2. Import users:
```bash
cd backend
tsx src/migrations/002_import_users.ts <path-to-export-file.json>
```

Note: Users will need to reset their passwords via Supabase Auth after migration.

## Component Updates

Most components should work without changes since `database.ts` maintains the same function signatures. However, some functions are now async:

- `getLeaderboard()` → `await getLeaderboard()`
- `getUserQuizHistory()` → `await getUserQuizHistory()`
- `getQuizProgress()` → `await getQuizProgress()`
- `saveQuizProgress()` → `await saveQuizProgress()`
- `recordQuestionAttempt()` → `await recordQuestionAttempt()`
- `saveQuizResult()` → `await saveQuizResult()`
- `saveAPTestAttempt()` → `await saveAPTestAttempt()`
- `getUserAPTestAttempts()` → `await getUserAPTestAttempts()`

Update components that use these functions to handle them as async.

## Testing

1. Start the backend server
2. Start the frontend development server
3. Test all features:
   - User registration and login
   - Taking quizzes
   - Viewing leaderboards
   - Analytics
   - AP tests

## Deployment

### Backend Deployment

1. Deploy backend to your hosting service (Railway, Vercel, AWS, etc.)
2. Set environment variables in your hosting platform
3. Update `CORS_ORIGIN` to your frontend URL

### Frontend Deployment

1. Update `.env.local` or build environment variables:
```
VITE_API_URL=https://your-backend-url.com/api
```

2. Build and deploy:
```bash
npm run build
```

## Rollback

If you need to rollback to localStorage:

1. Remove or comment out the API calls in `src/lib/database.ts`
2. Remove `VITE_API_URL` from environment variables
3. Components will automatically use localStorage fallback

## Notes

- The system supports gradual migration - both systems can run in parallel
- localStorage is used as fallback if API is unavailable
- All data is automatically migrated when using API functions
- User passwords cannot be migrated - users must reset via Supabase Auth

