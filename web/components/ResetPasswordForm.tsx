"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const [formData, setFormData] = useState({
    password: "",
    re_password: "",
  });
  const [passwordRequirements, setPasswordRequirements] = useState({
    hasUppercase: false,
    hasNumber: false,
    hasSpecial: false,
    passwordsMatch: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Validate form as user types
  useEffect(() => {
    setPasswordRequirements({
      hasUppercase: /[A-Z]/.test(formData.password),
      hasNumber: /[0-9]/.test(formData.password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
      passwordsMatch: formData.password === formData.re_password,
    });
  }, [formData]);

  // Redirect if no token is found
  useEffect(() => {
    if (!token) {
      router.push("/forgot-password");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    // Validate all requirements are met
    const { hasUppercase, hasNumber, hasSpecial, passwordsMatch } =
      passwordRequirements;
    if (!hasUppercase || !hasNumber || !hasSpecial || !passwordsMatch) {
      setError("Please ensure all password requirements are met");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: formData.password,
          re_password: formData.re_password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccess("Password has been successfully reset");
      // Clear form
      setFormData({
        password: "",
        re_password: "",
      });

      // Redirect to sign in page after 3 seconds
      setTimeout(() => {
        router.push("/signin");
      }, 3000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
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

  // If no token is found, show loading state until redirect happens
  if (!token) {
    return <div>Redirecting...</div>;
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Set New Password</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Create a new password for your account
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

      {success && (
        <Alert
          className="bg-green-50 border-green-500 text-green-700"
        >
          <AlertDescription className="text-sm flex gap-x-2 items-center">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          {/* Password requirements list */}
          <div className="text-xs mt-1 space-y-1">
            <div
              className={
                passwordRequirements.hasUppercase
                  ? "text-green-500"
                  : "text-gray-500"
              }
            >
              • At least one uppercase letter
            </div>
            <div
              className={
                passwordRequirements.hasNumber
                  ? "text-green-500"
                  : "text-gray-500"
              }
            >
              • At least one number
            </div>
            <div
              className={
                passwordRequirements.hasSpecial
                  ? "text-green-500"
                  : "text-gray-500"
              }
            >
              • At least one special character (!@#$%^&*(),.?":{}|&lt;&gt;)
            </div>
          </div>
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

          {formData.re_password && (
            <div
              className={
                passwordRequirements.passwordsMatch
                  ? "text-green-500 text-xs"
                  : "text-red-500 text-xs"
              }
            >
              {passwordRequirements.passwordsMatch
                ? "✓ Passwords match"
                : "✗ Passwords do not match"}
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={
            isLoading || !Object.values(passwordRequirements).every(Boolean)
          }
        >
          {isLoading ? "Resetting..." : "Reset Password"}
        </Button>
      </div>
    </form>
  );
}
