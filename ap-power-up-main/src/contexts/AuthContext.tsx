import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/database';
import { authApi, userApi, classApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, password: string, role: 'student' | 'teacher', apClasses: string[], firstName: string, lastName: string, nickname?: string) => Promise<{ success: boolean; message: string; classCode?: string }>;
  logout: () => void;
  refreshUser: () => void;
  addClass: (apClass: string) => void;
  removeClass: (apClass: string) => void;
  updateProfile: (updates: { firstName?: string; lastName?: string; nickname?: string; displayPreference?: 'username' | 'realName' | 'nickname'; showLeaderboard?: boolean; showRank?: boolean; showRankPublicly?: boolean; trackConfidence?: boolean }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get current user from API
    authApi.getCurrentUser()
      .then(userData => {
        // Transform API response to User format
        const transformedUser: User = {
          id: userData.id,
          username: userData.username,
          password: '', // Never expose password
          firstName: userData.first_name,
          lastName: userData.last_name,
          nickname: userData.nickname,
          displayPreference: userData.display_preference,
          role: userData.role,
          apClasses: userData.apClasses || [],
          classScores: userData.classScores || {},
          streak: userData.streak || 0,
          createdAt: userData.created_at,
          lastQuizDate: userData.last_quiz_date,
          lastDecayTimestamp: userData.last_decay_timestamp,
          dailyPoints: userData.dailyPoints,
          showLeaderboard: userData.show_leaderboard ?? true,
          showRank: userData.show_rank ?? true,
          showRankPublicly: userData.show_rank_publicly ?? true,
          trackConfidence: userData.track_confidence !== undefined ? userData.track_confidence : (localStorage.getItem('trackConfidence') !== null ? localStorage.getItem('trackConfidence') === 'true' : true)
        };
        setUser(transformedUser);
      })
      .catch(() => {
        // Not logged in or error
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const result = await authApi.login(username, password);
      if (result.success && result.user) {
        // Transform API response to User format
        const transformedUser: User = {
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
          showLeaderboard: result.user.show_leaderboard ?? true,
          showRank: result.user.show_rank ?? true,
          showRankPublicly: result.user.show_rank_publicly ?? true,
          trackConfidence: result.user.track_confidence !== undefined ? result.user.track_confidence : (localStorage.getItem('trackConfidence') !== null ? localStorage.getItem('trackConfidence') === 'true' : true)
        };
        setUser(transformedUser);
      }
      return { success: result.success, message: result.message };
    } catch (error: any) {
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const register = async (username: string, password: string, role: 'student' | 'teacher', apClasses: string[], firstName: string, lastName: string, nickname?: string) => {
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
        // For teachers, create a class for the first AP class they selected
        let classCode: string | undefined;
        if (role === 'teacher' && apClasses.length > 0) {
          try {
            const classResult = await classApi.createClass(apClasses[0]);
            if (classResult.success && classResult.classCode) {
              classCode = classResult.classCode;
            }
          } catch (error) {
            console.error('Failed to create class:', error);
          }
        }
        
        // Transform API response to User format
        const transformedUser: User = {
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
          showLeaderboard: result.user.show_leaderboard ?? true,
          showRank: result.user.show_rank ?? true,
          showRankPublicly: result.user.show_rank_publicly ?? true,
          trackConfidence: result.user.track_confidence !== undefined ? result.user.track_confidence : (localStorage.getItem('trackConfidence') !== null ? localStorage.getItem('trackConfidence') === 'true' : true)
        };
        setUser(transformedUser);
        
        return { success: result.success, message: result.message, classCode };
      }
      return { success: result.success, message: result.message };
    } catch (error: any) {
      return { success: false, message: error.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const userData = await authApi.getCurrentUser();
      // Preserve current values if API doesn't return them (backend might not include them in /auth/me)
      // Check localStorage as fallback for trackConfidence preference
      const storedTrackConfidence = localStorage.getItem('trackConfidence');
      const trackConfidenceValue = 'track_confidence' in userData && userData.track_confidence !== undefined 
        ? userData.track_confidence 
        : (user?.trackConfidence !== undefined ? user.trackConfidence : (storedTrackConfidence !== null ? storedTrackConfidence === 'true' : true));
      const showRankPubliclyValue = 'show_rank_publicly' in userData && userData.show_rank_publicly !== undefined
        ? userData.show_rank_publicly
        : (user.showRankPublicly ?? true);
      const finalClassScores = userData.classScores || {};
      const transformedUser: User = {
        id: userData.id,
        username: userData.username,
        password: '',
        firstName: userData.first_name,
        lastName: userData.last_name,
        nickname: userData.nickname,
        displayPreference: userData.display_preference,
        role: userData.role,
        apClasses: userData.apClasses || [],
        classScores: finalClassScores,
        streak: userData.streak || 0,
        createdAt: userData.created_at,
        lastQuizDate: userData.last_quiz_date,
        lastDecayTimestamp: userData.last_decay_timestamp,
        dailyPoints: userData.dailyPoints,
        showLeaderboard: userData.show_leaderboard,
        showRank: userData.show_rank,
        showRankPublicly: showRankPubliclyValue,
        trackConfidence: trackConfidenceValue
      };
      setUser(transformedUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  const addClass = async (apClass: string) => {
    if (user) {
      try {
        // Optimistically update the user state
        if (!user.apClasses.includes(apClass)) {
          const updatedUser = {
            ...user,
            apClasses: [...user.apClasses, apClass],
            classScores: {
              ...user.classScores,
              [apClass]: user.classScores[apClass] || 0
            }
          };
          setUser(updatedUser);
        }
        
        // Try to persist via API - first try the dedicated endpoint
        try {
          const result = await userApi.addClass(user.id, apClass);
          
          if (result.success && result.user) {
            // Update with server response
            const transformedUser: User = {
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
              showLeaderboard: result.user.show_leaderboard ?? true,
              showRank: result.user.show_rank ?? true,
              showRankPublicly: result.user.show_rank_publicly ?? true,
              trackConfidence: result.user.track_confidence !== undefined ? result.user.track_confidence : (user.trackConfidence ?? true)
            };
            setUser(transformedUser);
            return; // Success, exit early
          }
        } catch (addClassError: any) {
          // If dedicated endpoint doesn't exist, try updateProfile as fallback
          try {
            const updatedApClasses = [...user.apClasses];
            if (!updatedApClasses.includes(apClass)) {
              updatedApClasses.push(apClass);
            }
            await userApi.updateProfile(user.id, { apClasses: updatedApClasses });
            // Don't refresh - keep the optimistic update since updateProfile succeeded
            return;
          } catch (updateProfileError) {
            // Both API calls failed - keep the optimistic update, don't refresh
            // The optimistic update will remain in the UI even though it won't persist to backend
            return;
          }
        }
      } catch (error) {
        // Keep the optimistic update even if everything fails
        // Don't call refreshUser() as it would overwrite the optimistic update
      }
    }
  };

  const removeClass = async (apClass: string) => {
    if (user) {
      try {
        // Optimistically update the user state
        const updatedUser = {
          ...user,
          apClasses: user.apClasses.filter(c => c !== apClass)
        };
        setUser(updatedUser);
        
        // Try to persist via API
        const result = await userApi.removeClass(user.id, apClass);
        
        if (result.success && result.user) {
          // Update with server response
          const transformedUser: User = {
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
            showLeaderboard: result.user.show_leaderboard ?? true,
            showRank: result.user.show_rank ?? true,
            showRankPublicly: result.user.show_rank_publicly ?? true,
            trackConfidence: result.user.track_confidence !== undefined ? result.user.track_confidence : (user.trackConfidence ?? true)
          };
          setUser(transformedUser);
        } else {
          // If API doesn't support it or fails, refresh user to sync
          await refreshUser();
        }
      } catch (error) {
        // If API call fails, refresh user to get latest state
        await refreshUser();
      }
    }
  };

  const updateProfile = async (updates: { firstName?: string; lastName?: string; nickname?: string; displayPreference?: 'username' | 'realName' | 'nickname'; showLeaderboard?: boolean; showRank?: boolean; showRankPublicly?: boolean; trackConfidence?: boolean }) => {
    if (user) {
      try {
        const updatedUser = await userApi.updateProfile(user.id, updates);
        // Preserve requested value if API doesn't return it, otherwise use API value
        const trackConfidenceValue = 'track_confidence' in updatedUser && updatedUser.track_confidence !== undefined
          ? updatedUser.track_confidence
          : (updates.trackConfidence !== undefined ? updates.trackConfidence : (user.trackConfidence ?? true));
        // Save to localStorage as fallback since API doesn't return it
        if (updates.trackConfidence !== undefined) {
          localStorage.setItem('trackConfidence', String(updates.trackConfidence));
        }
        const showRankPubliclyValue = 'show_rank_publicly' in updatedUser && updatedUser.show_rank_publicly !== undefined
          ? updatedUser.show_rank_publicly
          : (updates.showRankPublicly !== undefined ? updates.showRankPublicly : (user.showRankPublicly ?? true));
        const transformedUser: User = {
          id: updatedUser.id,
          username: updatedUser.username,
          password: '',
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          nickname: updatedUser.nickname,
          displayPreference: updatedUser.display_preference,
          role: updatedUser.role,
          apClasses: updatedUser.apClasses || [],
          classScores: updatedUser.classScores || {},
          streak: updatedUser.streak || 0,
          createdAt: updatedUser.created_at,
          lastQuizDate: updatedUser.last_quiz_date,
          lastDecayTimestamp: updatedUser.last_decay_timestamp,
        dailyPoints: updatedUser.dailyPoints,
        showLeaderboard: updatedUser.show_leaderboard,
        showRank: updatedUser.show_rank,
        showRankPublicly: showRankPubliclyValue,
        trackConfidence: trackConfidenceValue
      };
        setUser(transformedUser);
      } catch (error: any) {
        console.error('Failed to update profile:', error);
        throw error; // Re-throw so caller can handle it
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, addClass, removeClass, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
