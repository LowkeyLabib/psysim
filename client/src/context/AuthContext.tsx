import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/api.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  switchRole: (role: UserRole) => void;
  setUserProfile: (name: string, role: UserRole) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem('psysim_user_role') as UserRole) || 'student';
  });
  const [user, setUser] = useState<UserProfile | null>(null);

  const fetchProfile = async () => {
    try {
      const data = await api.getMe();
      setUser(data);
    } catch {
      setUser({
        id: localStorage.getItem('psysim_user_id') || 'usr_student_demo',
        name: localStorage.getItem('psysim_user_name') || 'Dr. Medical Trainee',
        email: 'trainee@psysim.edu',
        role,
        created_at: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [role]);

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('psysim_user_role', newRole);
    if (newRole === 'supervisor') {
      localStorage.setItem('psysim_user_name', 'Prof. Clinical Supervisor');
      localStorage.setItem('psysim_user_id', 'usr_supervisor_demo');
    } else {
      localStorage.setItem('psysim_user_name', 'Dr. Medical Trainee');
      localStorage.setItem('psysim_user_id', 'usr_student_demo');
    }
    fetchProfile();
  };

  const setUserProfile = (name: string, newRole: UserRole) => {
    localStorage.setItem('psysim_user_name', name);
    localStorage.setItem('psysim_user_role', newRole);
    setRole(newRole);
    fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        switchRole,
        setUserProfile,
        refreshUser: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
