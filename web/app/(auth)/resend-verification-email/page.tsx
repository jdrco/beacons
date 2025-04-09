"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResendVerificationEmailPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const errorParam = searchParams.get("error");

    if (emailParam) {
      setEmail(emailParam);
    }

    if (errorParam) {
      switch (errorParam) {
        case "expired_token":
          setError(
            "Your verification link has expired. Please request a new one."
          );
          break;
        case "invalid_token":
          setError("Invalid verification link. Please request a new one.");
          break;
        case "user_not_found":
          setError("User not found. Please check your email address.");
          break;
        case "verification_failed":
          setError("Verification failed. Please try again.");
          break;
        default:
          setError("An error occurred during verification. Please try again.");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // if (!email.endsWith("@ualberta.ca")) {
      //   setError("Only @ualberta.ca email addresses are allowed");
      //   setIsLoading(false);
      //   return;
      // }

      const response = await fetch("/api/auth/resend-verification-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No account found with this email address");
        } else if (
          response.status === 400 &&
          data.message?.includes("already verified")
        ) {
          throw new Error("Your account is already verified. Please sign in.");
        } else {
          throw new Error(
            data.message || "Failed to resend verification email"
          );
        }
      }

      setSuccess("Verification email has been sent. Please check your inbox.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6")}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Verify your email</h1>
          <p className="text-balance text-sm text-muted-foreground">
            Enter your university email below and we&apos;ll send you a new
            verification link
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
            {isLoading ? "Sending..." : "Resend Verification Email"}
          </Button>
        </div>

        <div className="text-center text-sm">
          Already verified?&nbsp;
          <Link
            href="/signin"
            className="underline underline-offset-4 hover:text-primary"
          >
            Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
