import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, getCurrentUser, loginUser, logoutUser, registerUser, addClassToUser, removeClassFromUser, updateUserProfile, createClass } from '@/lib/database';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, password: string, role: 'student' | 'teacher', apClasses: string[], firstName: string, lastName: string, nickname?: string) => Promise<{ success: boolean; message: string; classCode?: string }>;
  logout: () => void;
  refreshUser: () => void;
  addClass: (apClass: string) => void;
  removeClass: (apClass: string) => void;
  updateProfile: (updates: { firstName?: string; lastName?: string; nickname?: string; displayPreference?: 'username' | 'realName' | 'nickname'; showLeaderboard?: boolean; showRank?: boolean }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const result = loginUser(username, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, message: result.message };
  };

  const register = async (username: string, password: string, role: 'student' | 'teacher', apClasses: string[], firstName: string, lastName: string, nickname?: string) => {
    const result = registerUser(username, password, role, apClasses, firstName, lastName, nickname);
    if (result.success && result.user) {
      // For teachers, create a class for the first AP class they selected
      let classCode: string | undefined;
      if (role === 'teacher' && apClasses.length > 0) {
        const classResult = createClass(result.user.id, apClasses[0]);
        if (classResult.success && classResult.classCode) {
          classCode = classResult.classCode;
        }
      }
      
      // Auto-login after registration
      loginUser(username, password);
      const currentUser = getCurrentUser();
      setUser(currentUser);
      
      return { success: result.success, message: result.message, classCode };
    }
    return { success: result.success, message: result.message };
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  const refreshUser = () => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  };

  const addClass = (apClass: string) => {
    if (user) {
      const updatedUser = addClassToUser(user.id, apClass);
      if (updatedUser) {
        setUser(updatedUser);
      }
    }
  };

  const removeClass = (apClass: string) => {
    if (user) {
      const updatedUser = removeClassFromUser(user.id, apClass);
      if (updatedUser) {
        setUser(updatedUser);
      }
    }
  };

  const updateProfile = (updates: { firstName?: string; lastName?: string; nickname?: string; displayPreference?: 'username' | 'realName' | 'nickname'; showLeaderboard?: boolean }) => {
    if (user) {
      const updatedUser = updateUserProfile(user.id, updates);
      if (updatedUser) {
        setUser(updatedUser);
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
