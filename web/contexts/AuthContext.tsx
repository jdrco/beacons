"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Define user type to match backend model
interface User {
  id?: string;
  email?: string;
  username?: string;
  education_level?: string;
  active?: boolean;
}

// Define the shape of the context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
});

// Export the provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Function to check if user is authenticated
  const checkAuth = async () => {
    try {
      setIsLoading(true);

      // Check if we have user data in localStorage (for initial quick load)
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      // Verify with backend
      const response = await fetch("/api/auth/me", {
        credentials: "include", // Include cookies
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      } else {
        // If backend verification fails, clear everything
        setUser(null);
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
      localStorage.removeItem("user");
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Convert to FormData as that's what OAuth2 password flow expects
      const formData = new FormData();
      formData.append("username", email); // Backend expects 'username' field for email
      formData.append("password", password);

      const response = await fetch("/api/auth/signin", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to sign in");
      }

      // After successful login, fetch full user info
      await checkAuth();

      // Navigate to home page
      router.push("/home");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      // Call logout endpoint
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        console.warn(
          "Server-side logout failed, continuing with client-side logout"
        );
      }

      // Clear local state
      setUser(null);
      localStorage.removeItem("user");

      // Redirect to landing page
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, clear local state and redirect
      setUser(null);
      localStorage.removeItem("user");
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication status on initial load
  useEffect(() => {
    checkAuth();
  }, []);

  // Create the context value object
  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
