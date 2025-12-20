/**
 * API Client Wrapper
 * Provides type-safe API methods matching the backend routes
 */

import api, { setAuthToken } from './apiClient';
import { User, QuestionAttempt, QuizResult, QuizProgress, Class, APTestAttempt } from './database';

// Auth API
export const authApi = {
  register: async (data: {
    username: string;
    password: string;
    role: 'student' | 'teacher';
    apClasses: string[];
    firstName: string;
    lastName: string;
    email?: string;
  }) => {
    const response = await api.post<{ success: boolean; message: string; user: any; token?: string }>('/auth/register', data);
    if (response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  login: async (username: string, password: string) => {
    const response = await api.post<{ success: boolean; message: string; user: any; token?: string }>('/auth/login', { username, password });
    if (response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  logout: async () => {
    await api.post('/auth/logout');
    setAuthToken(null);
  },

  getCurrentUser: async () => {
    return api.get<any>('/auth/me');
  },
};

// User API
export const userApi = {
  getUser: async (id: string) => {
    return api.get<any>(`/users/${id}`);
  },

  updateProfile: async (id: string, updates: {
    firstName?: string;
    lastName?: string;
    displayPreference?: 'realName' | 'nickname';
    showLeaderboard?: boolean;
    showRank?: boolean;
    showRankPublicly?: boolean;
    trackConfidence?: boolean;
    apClasses?: string[];
  }) => {
    // Transform trackConfidence to track_confidence for API
    const apiUpdates: any = { ...updates };
    if ('trackConfidence' in apiUpdates) {
      apiUpdates.track_confidence = apiUpdates.trackConfidence;
      delete apiUpdates.trackConfidence;
    }
    if ('showRankPublicly' in apiUpdates) {
      apiUpdates.show_rank_publicly = apiUpdates.showRankPublicly;
      delete apiUpdates.showRankPublicly;
    }
    if ('apClasses' in apiUpdates) {
      apiUpdates.ap_classes = apiUpdates.apClasses;
      delete apiUpdates.apClasses;
    }
    const response = await api.patch<any>(`/users/${id}`, apiUpdates);
    return response;
  },

  deleteAccount: async (id: string) => {
    return api.delete<{ success: boolean; message: string }>(`/users/${id}`);
  },

  updateScore: async (id: string, pointsToAdd: number, apClass: string) => {
    return api.post<{ success: boolean; newScore: number }>(`/users/${id}/score`, { pointsToAdd, apClass });
  },

  addClass: async (id: string, apClass: string) => {
    return api.post<{ success: boolean; message: string; user: any }>(`/users/${id}/classes`, { apClass });
  },

  removeClass: async (id: string, apClass: string) => {
    return api.delete<{ success: boolean; message: string; user: any }>(`/users/${id}/classes/${encodeURIComponent(apClass)}`);
  },
};

// Question API
export const questionApi = {
  getQuestions: async (filters?: { apClass?: string; unit?: string; subtopic?: string }) => {
    const params = new URLSearchParams();
    if (filters?.apClass) params.append('apClass', filters.apClass);
    if (filters?.unit) params.append('unit', filters.unit);
    if (filters?.subtopic) params.append('subtopic', filters.subtopic);
    
    const query = params.toString();
    return api.get<any[]>(`/questions${query ? `?${query}` : ''}`);
  },

  getQuestionById: async (id: string) => {
    return api.get<any>(`/questions/${id}`);
  },
};

// Quiz API
export const quizApi = {
  saveResult: async (result: Omit<QuizResult, 'timestamp'>) => {
    return api.post<any>('/quizzes/results', result);
  },

  getResults: async (userId: string, apClass?: string) => {
    const query = apClass ? `?apClass=${apClass}` : '';
    return api.get<any[]>(`/quizzes/results/${userId}${query}`);
  },

  saveProgress: async (progress: QuizProgress & { userId: string }) => {
    return api.post<any>('/quizzes/progress', progress);
  },

  getProgress: async (userId: string, apClass: string, unit: string) => {
    return api.get<any | null>(`/quizzes/progress/${userId}/${encodeURIComponent(apClass)}/${encodeURIComponent(unit)}`);
  },

  clearProgress: async (userId: string, apClass: string, unit: string) => {
    return api.delete<{ success: boolean; message: string }>(`/quizzes/progress/${userId}/${encodeURIComponent(apClass)}/${encodeURIComponent(unit)}`);
  },
};

// Attempt API
export const attemptApi = {
  recordAttempt: async (data: {
    userId: string;
    questionId: string;
    isCorrect: boolean;
    timeSpentSeconds?: number;
    selectedOptionId?: string;
    confidence?: number | null;
    timestamp?: string;
  }) => {
    return api.post<QuestionAttempt & { attemptNumber: number }>('/attempts', data);
  },

  getAttempts: async (userId: string, questionId?: string) => {
    const query = questionId ? `?questionId=${questionId}` : '';
    return api.get<QuestionAttempt[]>(`/attempts/${userId}${query}`);
  },

  getAttempt: async (userId: string, questionId: string) => {
    return api.get<QuestionAttempt | null>(`/attempts/${userId}/${questionId}`);
  },
};

// Leaderboard API
export const leaderboardApi = {
  getLeaderboard: async (apClass: string) => {
    return api.get<any[]>(`/leaderboard/${encodeURIComponent(apClass)}`);
  },

  getClassLeaderboard: async (apClass: string, classCode: string) => {
    return api.get<any[]>(`/leaderboard/${encodeURIComponent(apClass)}/class/${classCode}`);
  },
};

// Class API
export const classApi = {
  createClass: async (apClassName: string) => {
    return api.post<{ success: boolean; message: string; class: Class; classCode: string }>('/classes', { apClassName });
  },

  getClassByCode: async (code: string) => {
    return api.get<Class>(`/classes/${code}`);
  },

  joinClass: async (code: string) => {
    return api.post<{ success: boolean; message: string; class: Class }>(`/classes/${code}/join`);
  },

  getTeacherClasses: async (teacherId: string) => {
    return api.get<Class[]>(`/classes/teacher/${teacherId}`);
  },
};

// AP Test API
export const apTestApi = {
  getTests: async (apClass: string) => {
    return api.get<any[]>(`/ap-tests/${encodeURIComponent(apClass)}`);
  },

  getTestQuestions: async (apClass: string, testId: string) => {
    return api.get<any[]>(`/ap-tests/${encodeURIComponent(apClass)}/${testId}/questions`);
  },

  saveAttempt: async (attempt: APTestAttempt) => {
    return api.post<any>('/ap-tests/attempts', attempt);
  },

  getAttempts: async (userId: string, apClass?: string) => {
    const query = apClass ? `?apClass=${apClass}` : '';
    return api.get<APTestAttempt[]>(`/ap-tests/attempts/${userId}${query}`);
  },
};

export default {
  auth: authApi,
  user: userApi,
  question: questionApi,
  quiz: quizApi,
  attempt: attemptApi,
  leaderboard: leaderboardApi,
  class: classApi,
  apTest: apTestApi,
};

