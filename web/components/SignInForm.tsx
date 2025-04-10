"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/*
  4.2 User Sign-In

  REQ-1: The system shall provide user authentication via email and password.
  REQ-2: The system shall verify user credentials against stored information in the database.
  REQ-3: The system shall securely manage user sessions after successful authentication.
  REQ-4: The system shall provide the option to log out of the system.
  REQ-5: The system shall display appropriate error messages for invalid credentials.
  REQ-6: The system shall maintain the user's authentication state across sessions until explicit logout.
  REQ-7: The system shall redirect unauthenticated users to the login page when attempting to access protected features.
  REQ-8: The system shall provide a secure password reset functionality.
  REQ-9: The system shall allow users to request a password reset by submitting their registered email.
  REQ-10: The system shall send an email containing a password reset link upon request.
  REQ-11: The system shall verify and allow users to reset their password upon clicking the password reset link.
  REQ-12: The system shall display an appropriate error message for invalid or expired password reset links.
*/
export function SignInForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    username: "", // Email field (named username for backend compatibility)
    password: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Validate email domain
      if (!formData.username.endsWith("@ualberta.ca")) {
        setError("Only @ualberta.ca email addresses are allowed");
        return;
      }
      await login(formData.username, formData.password);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Invalid email or password";
      setError(errorMessage);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Sign in to your account</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your university email below to login to your account
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm flex gap-x-2 items-center">
            <AlertCircle className="w-4 h-4" />
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="username">Email</Label>
          <Input
            id="username"
            name="username"
            type="email"
            placeholder="name@ualberta.ca"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <a
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </div>

      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <a
          href="/signup"
          className="underline underline-offset-4 hover:text-primary"
        >
          Sign Up
        </a>
      </div>
    </form>
  );
}
