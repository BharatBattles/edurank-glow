import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Mock user type for now - will be replaced with Supabase types
interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const storedUser = localStorage.getItem('edurank_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      // Mock login - will be replaced with Supabase auth
      if (email && password.length >= 6) {
        const mockUser = { id: '1', email, name: email.split('@')[0] };
        setUser(mockUser);
        localStorage.setItem('edurank_user', JSON.stringify(mockUser));
        return {};
      }
      return { error: 'Invalid credentials' };
    } catch (error) {
      return { error: 'Login failed' };
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<{ error?: string }> => {
    try {
      // Mock signup - will be replaced with Supabase auth
      if (email && password.length >= 6 && name) {
        const mockUser = { id: '1', email, name };
        setUser(mockUser);
        localStorage.setItem('edurank_user', JSON.stringify(mockUser));
        return {};
      }
      return { error: 'Please fill all fields correctly' };
    } catch (error) {
      return { error: 'Signup failed' };
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('edurank_user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
