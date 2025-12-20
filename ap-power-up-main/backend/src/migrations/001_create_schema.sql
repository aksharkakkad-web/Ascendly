-- Database Schema for AP Quiz Platform
-- This migration creates all necessary tables for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE display_preference AS ENUM ('realName', 'nickname');
CREATE TYPE user_role AS ENUM ('student', 'teacher');
CREATE TYPE attempt_status AS ENUM ('unanswered', 'correct', 'incorrect');

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    nickname TEXT UNIQUE,
    display_preference display_preference NOT NULL DEFAULT 'nickname',
    role user_role NOT NULL DEFAULT 'student',
    streak INTEGER NOT NULL DEFAULT 0,
    last_quiz_date TIMESTAMP WITH TIME ZONE,
    last_decay_timestamp TIMESTAMP WITH TIME ZONE,
    show_leaderboard BOOLEAN NOT NULL DEFAULT true,
    show_rank BOOLEAN NOT NULL DEFAULT true,
    show_rank_publicly BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. User AP Classes (junction table)
CREATE TABLE IF NOT EXISTS public.user_ap_classes (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ap_class TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, ap_class)
);

-- 3. User Class Scores
CREATE TABLE IF NOT EXISTS public.user_class_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ap_class TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, ap_class)
);

-- 4. Daily Points
CREATE TABLE IF NOT EXISTS public.daily_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, date)
);

-- 5. Questions
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of {id: string, content: string}
    correct_answer_id TEXT NOT NULL,
    explanation TEXT,
    ap_class TEXT NOT NULL,
    unit_name TEXT NOT NULL,
    subtopic_name TEXT,
    metadata JSONB DEFAULT '{}', -- skill_tags, difficulty, estimated_time, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for questions
CREATE INDEX IF NOT EXISTS idx_questions_ap_class_unit ON public.questions(ap_class, unit_name, subtopic_name);

-- 6. Question Attempts
CREATE TABLE IF NOT EXISTS public.question_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    attempts INTEGER NOT NULL DEFAULT 1,
    correct_attempts INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    last_attempt_timestamp BIGINT, -- Unix timestamp
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    status attempt_status NOT NULL DEFAULT 'unanswered',
    is_correct BOOLEAN NOT NULL DEFAULT false,
    confidence INTEGER,
    last_practiced_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}', -- answer_events, skill_mastery_snapshot, etc.
    UNIQUE (user_id, question_id)
);

-- Index for question attempts
CREATE INDEX IF NOT EXISTS idx_question_attempts_user ON public.question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question ON public.question_attempts(question_id);

-- 7. Quiz Results
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ap_class TEXT NOT NULL,
    unit TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    points_earned INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for quiz results
CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_class ON public.quiz_results(user_id, ap_class);

-- 8. Quiz Progress
CREATE TABLE IF NOT EXISTS public.quiz_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ap_class TEXT NOT NULL,
    unit TEXT NOT NULL,
    current_index INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    answered_questions INTEGER[] NOT NULL DEFAULT '{}',
    points_earned INTEGER NOT NULL DEFAULT 0,
    session_correct_answers INTEGER NOT NULL DEFAULT 0,
    session_total_answered INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, ap_class, unit)
);

-- Index for quiz progress
CREATE INDEX IF NOT EXISTS idx_quiz_progress_user ON public.quiz_progress(user_id);

-- 9. Classes (teacher-created classes)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_code TEXT UNIQUE NOT NULL,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ap_class_name TEXT NOT NULL,
    leaderboard_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for classes
CREATE INDEX IF NOT EXISTS idx_classes_code ON public.classes(class_code);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON public.classes(teacher_id);

-- 10. Class Students (junction table)
CREATE TABLE IF NOT EXISTS public.class_students (
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (class_id, student_id)
);

-- Index for class students
CREATE INDEX IF NOT EXISTS idx_class_students_class ON public.class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON public.class_students(student_id);

-- 11. AP Test Questions
CREATE TABLE IF NOT EXISTS public.ap_test_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id TEXT NOT NULL, -- e.g., "AP_Biology_Test_1"
    ap_class TEXT NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    skill_type TEXT,
    difficulty TEXT,
    estimated_time_seconds INTEGER,
    tags TEXT[] DEFAULT '{}',
    question_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for AP test questions
CREATE INDEX IF NOT EXISTS idx_ap_test_questions_test ON public.ap_test_questions(test_id, ap_class);
CREATE INDEX IF NOT EXISTS idx_ap_test_questions_order ON public.ap_test_questions(test_id, question_order);

-- 12. AP Test Attempts
CREATE TABLE IF NOT EXISTS public.ap_test_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ap_class TEXT NOT NULL,
    test_id TEXT NOT NULL,
    start_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    end_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_time_used_seconds INTEGER NOT NULL,
    responses JSONB NOT NULL, -- Array of question responses
    summary JSONB NOT NULL, -- Calculated summary data
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for AP test attempts
CREATE INDEX IF NOT EXISTS idx_ap_test_attempts_user ON public.ap_test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_ap_test_attempts_user_class ON public.ap_test_attempts(user_id, ap_class);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_class_scores_updated_at BEFORE UPDATE ON public.user_class_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_progress_updated_at BEFORE UPDATE ON public.quiz_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ap_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_class_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_test_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own data and update their own data
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Questions are publicly readable
CREATE POLICY "Questions are publicly readable" ON public.questions
    FOR SELECT USING (true);

-- Question attempts: users can read/update their own
CREATE POLICY "Users can read own question attempts" ON public.question_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own question attempts" ON public.question_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own question attempts" ON public.question_attempts
    FOR UPDATE USING (auth.uid() = user_id);

-- Quiz results: users can read their own
CREATE POLICY "Users can read own quiz results" ON public.quiz_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz results" ON public.quiz_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quiz progress: users can read/update their own
CREATE POLICY "Users can read own quiz progress" ON public.quiz_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz progress" ON public.quiz_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz progress" ON public.quiz_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quiz progress" ON public.quiz_progress
    FOR DELETE USING (auth.uid() = user_id);

-- User AP classes: users can read/update their own
CREATE POLICY "Users can read own AP classes" ON public.user_ap_classes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AP classes" ON public.user_ap_classes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AP classes" ON public.user_ap_classes
    FOR DELETE USING (auth.uid() = user_id);

-- User class scores: users can read their own
CREATE POLICY "Users can read own class scores" ON public.user_class_scores
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own class scores" ON public.user_class_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own class scores" ON public.user_class_scores
    FOR UPDATE USING (auth.uid() = user_id);

-- Daily points: users can read their own
CREATE POLICY "Users can read own daily points" ON public.daily_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily points" ON public.daily_points
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily points" ON public.daily_points
    FOR UPDATE USING (auth.uid() = user_id);

-- Classes: teachers can manage their classes, students can read classes they're in
CREATE POLICY "Anyone can read classes by code" ON public.classes
    FOR SELECT USING (true);

CREATE POLICY "Teachers can create classes" ON public.classes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

CREATE POLICY "Teachers can update own classes" ON public.classes
    FOR UPDATE USING (teacher_id = auth.uid());

-- Class students: students can read classes they're in, teachers can read their class rosters
CREATE POLICY "Users can read class students for their classes" ON public.class_students
    FOR SELECT USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE id = class_id AND teacher_id = auth.uid()
        )
    );

CREATE POLICY "Users can join classes" ON public.class_students
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- AP test questions: publicly readable
CREATE POLICY "AP test questions are publicly readable" ON public.ap_test_questions
    FOR SELECT USING (true);

-- AP test attempts: users can read/insert their own
CREATE POLICY "Users can read own AP test attempts" ON public.ap_test_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AP test attempts" ON public.ap_test_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Note: For leaderboard queries, we'll need service role access or additional policies
-- that allow reading aggregated score data. This can be handled via API endpoints
-- using service role key, or by creating views with appropriate policies.

