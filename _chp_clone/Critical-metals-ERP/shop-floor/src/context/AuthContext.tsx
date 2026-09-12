import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  fullName: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  sessionId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem('sessionId'));
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Verify session on mount
  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Session-Id': sessionId || ''
          }
        });

        const data = await response.json();

        if (!data.success) {
          // Session invalid, clear auth
          clearAuth();
        }
      } catch (error) {
        console.error('Session verification failed', error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [token, sessionId]);

  const clearAuth = () => {
    setToken(null);
    setSessionId(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    queryClient.clear();
  };

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }
      
      return data.data;
    },
    onSuccess: (data) => {
      setToken(data.token);
      setSessionId(data.sessionId);
      setUser(data.user);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('sessionId', data.sessionId);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      clearAuth();
      toast.success('Logged out successfully');
      navigate('/login');
    }
  });

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    
    return user.permissions.some(p => {
      if (p === permission) return true;
      if (p.endsWith(':*')) {
        const prefix = p.slice(0, -2);
        return permission.startsWith(prefix);
      }
      return false;
    });
  };

  const value: AuthContextType = {
    user,
    token,
    sessionId,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  return { isAuthenticated, isLoading };
}
