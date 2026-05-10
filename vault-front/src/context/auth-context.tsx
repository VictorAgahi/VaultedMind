"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, AuthResponse, LoginCredentials, RegisterData } from "@/types";
import { apiService } from "@/services/api.service";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const userData = await apiService.get<User>("/auth/me");
          setUser(userData);
        } catch (error) {
          console.error("Failed to initialize auth", error);
          localStorage.removeItem("access_token");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const response = await apiService.post<AuthResponse, LoginCredentials>("/auth/login", credentials);
      const token = response.token;
      localStorage.setItem("access_token", token);
      document.cookie = `access_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
      setUser(response.user);
      router.push("/dashboard");
    } catch (error) {
      setLoading(false);
      throw error;
    }
    setLoading(false);
  };

  const register = async (userData: RegisterData) => {
    setLoading(true);
    try {
      const response = await apiService.post<AuthResponse, RegisterData>("/auth/register", userData);
      const token = response.token;
      localStorage.setItem("access_token", token);
      document.cookie = `access_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
      setUser(response.user);
      router.push("/dashboard");
    } catch (error) {
      setLoading(false);
      throw error;
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    // Remove cookie
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
