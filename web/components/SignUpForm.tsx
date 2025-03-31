"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SignUpForm({
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
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

      router.push("/signin");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create account";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError(null);
  };

  const handleEducationChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      education_level: value,
    }));
    setError(null);
  };

  return (
    <div {...props}>
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>Create a new account to get started</CardDescription>
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

              <div className="grid gap-2">
                <Label htmlFor="education_level">Education Level</Label>
                <Select
                  value={formData.education_level}
                  onValueChange={handleEducationChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                    <SelectItem value="Graduate">Graduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Sign Up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <a
                href="/signin"
                className="underline underline-offset-4 hover:text-primary"
              >
                Sign In
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
