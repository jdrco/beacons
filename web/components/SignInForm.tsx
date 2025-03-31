"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SignInForm({
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
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
    <div {...props}>
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="text-sm flex gap-x-2 items-center">
                <AlertCircle className="w-4 h-4" />
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
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
                <Label htmlFor="password">Password</Label>
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
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <a
                href="/signup"
                className="underline underline-offset-4 hover:text-primary"
              >
                Sign Up
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
