import { createContext, useContext, useState } from 'react';
import { apiUpdateProfile } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch { return null; }
  });

  const login = (userData) => {
    const u = { ...userData, loginAt: new Date().toISOString() };
    localStorage.setItem('auth_user', JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  // Update user state AND localStorage without API call (used after family join/create)
  const updateUserLocally = (updates) => {
    const updated = { ...user, ...updates };
    localStorage.setItem('auth_user', JSON.stringify(updated));
    setUser(updated);
  };

  const updateProfile = async ({ nama, email }) => {
    if (!user?.id) return { success: false, error: 'Tidak ada sesi aktif.' };
    const res = await apiUpdateProfile({ id: user.id, nama, email });
    if (res.success) {
      const updated = { ...user, ...res.user };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      setUser(updated);
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout, updateProfile, updateUserLocally }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
