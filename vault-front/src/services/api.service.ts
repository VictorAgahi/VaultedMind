import { ApiError } from "@/types";

const isServer = typeof window === "undefined";
const BACKEND_URL = isServer
  ? "http://vault-backend"
  : (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080");

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = BACKEND_URL.endsWith("/") ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include"
      });

      if (!response.ok) {
        let errorData: ApiError;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            message: "An unexpected error occurred",
            statusCode: response.status,
          };
        }

        if (response.status === 401 || response.status === 403 || (response.status === 400 && errorData.message?.toLowerCase().includes("token"))) {
          if (typeof window !== "undefined") {
            const publicRoutes = ["/", "/login", "/register", "/about", "/contact", "/privacy", "/terms"];
            const isPublicPage = publicRoutes.includes(window.location.pathname);
            if (!isPublicPage) {
              window.location.href = "/login?reason=session_expired";
            }
          }
        }

        throw errorData;
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw error;
      }
      if ((error as ApiError).statusCode) {
        throw error;
      }
      throw {
        message: (error as Error).message || "Network Error",
        statusCode: 500,
      };
    }
  }

  public get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  public post<T, D = Record<string, unknown>>(endpoint: string, data?: D, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public put<T, D = Record<string, unknown>>(endpoint: string, data?: D, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  public patch<T, D = Record<string, unknown>>(endpoint: string, data?: D, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  public delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const apiService = new ApiService();
