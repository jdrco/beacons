"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function RequestPasswordResetForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Validate email domain
      if (!email.endsWith("@ualberta.ca")) {
        setError("Only @ualberta.ca email addresses are allowed");
        setIsLoading(false);
        return;
      }

      console.log("Sending password reset request for:", email);

      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log("Response:", response.status, data);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No account found with this email address");
        } else if (
          response.status === 400 &&
          data.message?.includes("not verified")
        ) {
          throw new Error(
            "Your account is not verified. Please check your email for the verification link"
          );
        } else {
          throw new Error(
            data.message || "Failed to send password reset email"
          );
        }
      }

      setSuccess("Password reset link has been sent to your email");
      setEmail("");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your university email below and we&apos;ll send you a password
          reset link
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
        <Alert className="bg-green-50 border-green-500 text-green-700">
          <AlertDescription className="text-sm flex gap-x-2 items-center">
            <CheckCircle2 className="w-4 h-4" />
            {success}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Reset Link"}
        </Button>
      </div>

      <div className="text-center text-sm">
        Remember your password?&nbsp;
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
