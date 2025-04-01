"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    re_password: "",
    education_level: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = (password: string) => {
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter.";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number.";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return "Password must contain at least one special character.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.re_password) {
      setError("Passwords do not match.");
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Validate email domain
    if (!formData.email.endsWith("@ualberta.ca")) {
      setError("Only @ualberta.ca email addresses are allowed.");
      return;
    }

    // Validate education level
    if (
      formData.education_level &&
      !["Undergraduate", "Graduate"].includes(formData.education_level)
    ) {
      setError("Education level must be either Undergraduate or Graduate.");
      return;
    }

    // Validate username
    if (!formData.username.trim()) {
      setError("Username is required.");
      return;
    }

    setIsLoading(true);

    // Prepare the data in the format the backend expects
    const dataToSend = {
      email: formData.email,
      username: formData.username,
      password: formData.password,
      re_password: formData.re_password,
      education_level: formData.education_level || null,
    };

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      // Show success message instead of immediate redirect
      setSuccess(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create account";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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

  // If registration was successful, show the verification message
  if (success) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Account Created</h1>
          <p className="text-balance text-sm text-muted-foreground">
            Please verify your email address
          </p>
        </div>

        <Alert className="bg-green-950/50 border-green-800 text-green-300">
          <AlertDescription className="text-sm flex gap-x-2 items-center">
            <CheckCircle2 className="w-4 h-4" />
            Account created successfully!
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <p>
            We've sent a verification link to <strong>{formData.email}</strong>.
            Please check your inbox and click the link to verify your account.
          </p>

          <p className="text-sm text-muted-foreground">
            The verification link will expire in 24 hours. If you don't see the
            email, please check your spam or junk folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your information below to sign up for Beacons
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
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@ualberta.ca"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <p className="text-xs text-muted-foreground">
            Only @ualberta.ca email addresses are allowed
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <p className="text-xs text-muted-foreground">
            This is your display name that others will see
          </p>
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
          <p className="text-xs text-muted-foreground">
            Must contain uppercase letter, number, and special character
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="re_password">Confirm Password</Label>
          <Input
            id="re_password"
            name="re_password"
            type="password"
            value={formData.re_password}
            onChange={handleChange}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Sign Up"}
        </Button>
      </div>

      <div className="text-center text-sm">
        Already have an account?{" "}
        <a
          href="/signin"
          className="underline underline-offset-4 hover:text-primary"
        >
          Sign In
        </a>
      </div>
    </form>
  );
}
