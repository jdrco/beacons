"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Program {
  id: string;
  name: string;
  is_undergrad: boolean;
  faculty: string;
}

interface Faculty {
  name: string;
}

/*
  4.1 User Registration
  REQ-1: The system shall provide user registration via email and password.
  REQ-2: The system shall verify that the provided email address is valid.
  REQ-3: The system shall enforce password security requirements (minimum length, complexity).
  REQ-4: The system shall store valid user information in the database after successful registration (Email, Password hash, Registration timestamp).
  REQ-5: The system shall generate a random appropriate unique username (display name) for the user after successful registration.
  REQ-6: The system shall display appropriate error messages for invalid email format, password requirements, or existing email.
  REQ-7: The system shall send an email verification link upon successful registration
  REQ-8: The system shall verify and activate the user’s account upon clicking the email verification link
*/
export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    re_password: "",
    is_undergrad: true,
    faculty: "",
    program: null as string | null,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);

  // Fetch faculties and programs on initial load
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setIsLoadingPrograms(true);
        // Fetch all programs without pagination limit
        const response = await fetch(`/api/programs`);

        if (!response.ok) {
          throw new Error("Failed to fetch programs");
        }

        const data = await response.json();

        if (data.status && data.data) {
          setPrograms(data.data);

          // First collect all faculty names that are strings
          const allFacultyNames: string[] = [];
          data.data.forEach((program: Program) => {
            if (typeof program.faculty === "string" && program.faculty) {
              allFacultyNames.push(program.faculty);
            }
          });

          // Then get unique values and create Faculty objects
          const uniqueFacultyNames = [...new Set(allFacultyNames)].sort();
          const facultyObjects: Faculty[] = uniqueFacultyNames.map((name) => ({
            name,
          }));

          setFaculties(facultyObjects);
        }
      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setIsLoadingPrograms(false);
      }
    };

    fetchPrograms();
  }, []);

  // The rest of the component remains the same...

  // Filter programs when faculty or education level changes
  useEffect(() => {
    if (formData.faculty) {
      const filtered = programs.filter(
        (program) =>
          program.faculty === formData.faculty &&
          program.is_undergrad === formData.is_undergrad
      );
      setFilteredPrograms(filtered);
    } else {
      setFilteredPrograms([]);
    }
  }, [formData.faculty, programs, formData.is_undergrad]);

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

    setIsLoading(true);

    // Find the program name from the selected program ID
    let programName = null;

    if (formData.program) {
      const selectedProgram = programs.find((p) => p.id === formData.program);
      if (selectedProgram) {
        programName = selectedProgram.name;
      }
    }

    // Prepare the data in the format the backend expects
    const dataToSend = {
      email: formData.email,
      password: formData.password,
      re_password: formData.re_password,
      program: programName,
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

  const handleFacultyChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      faculty: value,
      program: null, // Reset program when faculty changes
    }));
  };

  const handleEducationLevelChange = (value: string) => {
    const isUndergrad = value === "Undergraduate";
    setFormData((prev) => ({
      ...prev,
      is_undergrad: isUndergrad,
      program: null, // Reset program when education level changes
    }));
  };

  const handleProgramChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      program: value,
    }));
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
            We&apos;ve sent a verification link to{" "}
            <strong>{formData.email}</strong>. Please check your inbox and click
            the link to verify your account.
          </p>

          <p className="text-sm text-muted-foreground">
            The verification link will expire in 30 minutes. If you don&apos;t
            see the email, please check your spam or junk folder.
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
          Enter your information below to sign up
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
          <Label htmlFor="education">Education Level</Label>
          <Select
            value={formData.is_undergrad ? "Undergraduate" : "Graduate"}
            onValueChange={handleEducationLevelChange}
          >
            <SelectTrigger id="education">
              <SelectValue placeholder="Select education level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Undergraduate">Undergraduate</SelectItem>
              <SelectItem value="Graduate">Graduate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="faculty">Faculty</Label>
          <Select
            value={formData.faculty}
            onValueChange={handleFacultyChange}
            disabled={isLoadingPrograms}
          >
            <SelectTrigger id="faculty">
              <SelectValue placeholder="Select faculty" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {faculties.map((faculty) => (
                <SelectItem key={faculty.name} value={faculty.name}>
                  {faculty.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="program">Program</Label>
          <Select
            value={formData.program || ""}
            onValueChange={handleProgramChange}
            disabled={!formData.faculty || isLoadingPrograms}
          >
            <SelectTrigger id="program">
              <SelectValue placeholder="Select program" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {filteredPrograms.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.faculty &&
            filteredPrograms.length === 0 &&
            !isLoadingPrograms && (
              <p className="text-xs text-red-400">
                No {formData.is_undergrad ? "undergraduate" : "graduate"}{" "}
                programs found for this faculty.
              </p>
            )}
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
