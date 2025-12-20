# AP Quiz Platform Backend

Node.js/Express backend for the AP Quiz Platform, using Supabase as the database.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

3. Set up the database:
   - Create a new Supabase project at https://supabase.com
   - Run the migration SQL script:
     - Copy the contents of `src/migrations/001_create_schema.sql`
     - Run it in the Supabase SQL editor

4. Run the server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user account

### Questions
- `GET /api/questions` - Get questions (with filters: apClass, unit, subtopic)
- `GET /api/questions/:id` - Get question by ID
- `POST /api/questions` - Create question (teacher only)
- `POST /api/questions/import` - Bulk import questions (teacher only)

### Quizzes
- `POST /api/quizzes/results` - Save quiz result
- `GET /api/quizzes/results/:userId` - Get user's quiz history
- `POST /api/quizzes/progress` - Save quiz progress
- `GET /api/quizzes/progress/:userId/:apClass/:unit` - Get quiz progress
- `DELETE /api/quizzes/progress/:userId/:apClass/:unit` - Clear progress

### Attempts
- `POST /api/attempts` - Record question attempt
- `GET /api/attempts/:userId` - Get all attempts for user
- `GET /api/attempts/:userId/:questionId` - Get attempts for specific question

### Leaderboard
- `GET /api/leaderboard/:apClass` - Get global leaderboard
- `GET /api/leaderboard/:apClass/class/:classCode` - Get class-specific leaderboard

### Classes
- `POST /api/classes` - Create class (teacher only)
- `GET /api/classes/:code` - Get class by code
- `POST /api/classes/:code/join` - Join class by code
- `GET /api/classes/teacher/:teacherId` - Get teacher's classes

### AP Tests
- `GET /api/ap-tests/:apClass` - Get available tests
- `GET /api/ap-tests/:apClass/:testId/questions` - Get test questions
- `POST /api/ap-tests/attempts` - Save AP test attempt
- `GET /api/ap-tests/attempts/:userId` - Get user's AP test attempts

## Migration

### Import Questions

1. Import practice questions:
```bash
npm run migrate
# Or:
tsx src/migrations/003_import_questions.ts [path-to-questions-dir]
```

2. Import AP test questions:
```bash
tsx src/migrations/004_import_ap_test_questions.ts [path-to-ap-tests-dir]
```

### Import Users

1. Export localStorage data using the browser console script in `src/migrations/export-localStorage.js`
2. Import users:
```bash
tsx src/migrations/002_import_users.ts <path-to-export-file.json>
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Environment Variables

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)
- `SUPABASE_ANON_KEY` - Supabase anonymous key (optional)
- `PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:5173)
- `NODE_ENV` - Environment (development/production)

