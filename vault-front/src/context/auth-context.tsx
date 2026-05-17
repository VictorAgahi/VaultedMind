"use client";

import React, { createContext, use, useState, useEffect, ReactNode } from "react";
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
  const { push } = useRouter();

  useEffect(() => {
    const controller = new AbortController();

    const initAuth = async () => {
      try {
        const userData = await apiService.get<User>("/auth/me", { signal: controller.signal });
        setUser(userData);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        console.debug("Not authenticated", error);

        if (typeof window !== "undefined") {
          const publicRoutes = ["/", "/login", "/register", "/about", "/contact", "/privacy", "/terms"];
          if (!publicRoutes.includes(window.location.pathname)) {
            push("/login?reason=session_invalid");
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    initAuth();
    return () => controller.abort();
  }, [push]);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const response = await apiService.post<AuthResponse, LoginCredentials>("/auth/login", credentials);
      setUser(response.user);
      setTimeout(() => {
        push("/dashboard");
      }, 150);
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
      setUser(response.user);
      setTimeout(() => {
        push("/dashboard");
      }, 150);
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
    push("/login");
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
  const context = use(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
