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
    const controller = new AbortController();

    const initAuth = async () => {
      try {
        const userData = await apiService.get<User>("/auth/me", { signal: controller.signal });
        setUser(userData);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        // Not logged in or session expired
        console.debug("Not authenticated");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    initAuth();
    return () => controller.abort();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const response = await apiService.post<AuthResponse, LoginCredentials>("/auth/login", credentials);
      // Token is now set via HttpOnly cookie by backend
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
      // Token is now set via HttpOnly cookie by backend
      setUser(response.user);
      router.push("/dashboard");
    } catch (error) {
      setLoading(false);
      throw error;
    }
    setLoading(false);
  };

  const logout = async () => {
    try {
      await apiService.post("/auth/logout");
    } catch (error) {
      console.error("Logout error", error);
    }
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
