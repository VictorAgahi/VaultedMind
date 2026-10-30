"use client";

import React, { createContext, use, useState, useEffect, ReactNode } from "react";
import { User, AuthResponse, LoginCredentials, RegisterData } from "@/types";
import { clearOfflineData } from "@/utils/entry-outbox";
import { apiService } from "@/services/api.service";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  refreshUser: () => Promise<void>;
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
      await apiService.post<AuthResponse, LoginCredentials>("/auth/login", credentials);
      setUser(await apiService.get<User>("/auth/me"));
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
      await apiService.post<AuthResponse, RegisterData>("/auth/register", userData);
      setUser(await apiService.get<User>("/auth/me"));
      // Un nouveau compte n'a aucun champ : on commence par choisir quoi suivre.
      setTimeout(() => {
        push("/onboarding");
      }, 150);
    } catch (error) {
      setLoading(false);
      throw error;
    }
    setLoading(false);
  };

  const refreshUser = async () => {
    setUser(await apiService.get<User>("/auth/me"));
  };

  const logout = async () => {
    clearOfflineData();
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
        refreshUser,
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
