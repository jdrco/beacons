"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Define user type with program and faculty information
interface User {
  id?: string;
  email?: string;
  username?: string;
  program_id?: string;
  program?: {
    id?: string;
    name?: string;
    is_undergrad?: boolean;
    faculty?: string;
  };
  faculty?: string;
  is_undergrad?: boolean;
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
  getAuthToken: () => Promise<string | null>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  getAuthToken: async () => null,
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

      // Verify with backend (we're using cookie-based auth, so this should work if cookie exists)
      const response = await fetch("/api/auth/me", {
        credentials: "include", // Include cookies
      });

      if (response.ok) {
        const userData = await response.json();

        // Process program information to make it easily accessible
        const enhancedUser: User = {
          ...userData,
          faculty: userData.program?.faculty || "",
          is_undergrad: userData.program?.is_undergrad !== false,
        };

        setUser(enhancedUser);
        localStorage.setItem("user", JSON.stringify(enhancedUser));
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
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch("/api/auth/signin", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to sign in");
      }

      // For immediate UI feedback, set a basic user object
      // This will be enhanced by checkAuth
      setUser({
        email: email,
        username: email.split("@")[0], // Simple fallback
      });

      // After successful login, fetch full user info
      await checkAuth();

      // Navigate to home page
      router.push("/home");
      router.refresh();
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
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });

      // Clear local state
      setUser(null);
      localStorage.removeItem("user");

      // Perform a hard redirect instead of using router.push
      // This forces a complete page reload and avoids stale states
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, try the hard redirect anyway
      window.location.href = "/";
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication status on initial load
  useEffect(() => {
    checkAuth();
  }, []);

  // Add this function to expose the token
  const getAuthToken = async () => {
    try {
      // Make a request to a custom endpoint that will return the token
      const response = await fetch("/api/auth/get-token", {
        method: "GET",
        credentials: "include", // Important: include cookies in the request
      });

      if (!response.ok) {
        console.error("Failed to fetch auth token");
        return null;
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error("Error fetching auth token:", error);
      return null;
    }
  };

  // Create the context value object
  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
    getAuthToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
