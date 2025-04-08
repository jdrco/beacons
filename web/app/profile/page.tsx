"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  PenLine,
  LogOut,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import ProfilePhoto from "@/components/ProfilePhoto";

interface Program {
  id: string;
  name: string;
  is_undergrad: boolean;
  faculty: string;
}

interface Faculty {
  name: string;
}

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated, logout, checkAuth } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);

  const [profileData, setProfileData] = useState({
    username: "",
    faculty: "",
    program_id: "",
    is_undergrad: true,
  });

  useEffect(() => {
    // Load user data when available
    if (user) {
      setProfileData({
        username: user.username || "",
        faculty: user.program?.faculty || user.faculty || "",
        program_id: user.program_id || "",
        is_undergrad: user.program?.is_undergrad !== false,
      });
    }
  }, [user]);

  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin");
    }
  }, [isLoading, isAuthenticated, router]);

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
        toast({
          title: "Error",
          description: "Failed to load programs",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPrograms(false);
      }
    };

    if (isEditing) {
      fetchPrograms();
    }
  }, [isEditing, toast]);

  // Filter programs when faculty changes
  useEffect(() => {
    if (profileData.faculty) {
      const filtered = programs.filter(
        (program) =>
          program.faculty === profileData.faculty &&
          program.is_undergrad === profileData.is_undergrad
      );
      setFilteredPrograms(filtered);
    } else {
      setFilteredPrograms([]);
    }
  }, [profileData.faculty, programs, profileData.is_undergrad]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFacultyChange = (value: string) => {
    setProfileData((prev) => ({
      ...prev,
      faculty: value,
      program_id: "", // Reset program when faculty changes
    }));
  };

  const handleEducationLevelChange = (value: string) => {
    const isUndergrad = value === "Undergraduate";
    setProfileData((prev) => ({
      ...prev,
      is_undergrad: isUndergrad,
      program_id: "", // Reset program when education level changes
    }));
  };

  const handleProgramChange = (value: string) => {
    setProfileData((prev) => ({
      ...prev,
      program_id: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast({
        title: "Error",
        description: "User information not available",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Find the program name from the selected program_id
      let programName = null;
      if (profileData.program_id) {
        const selectedProgram = programs.find(
          (p) => p.id === profileData.program_id
        );
        if (selectedProgram) {
          programName = selectedProgram.name;
        }
      }

      // Make API call to update user profile
      const response = await fetch("/api/user/profile/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: profileData.username,
          program: programName, // Send program name instead of program_id
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update profile");
      }

      // Update local auth context after successful update
      await checkAuth();

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      // Exit edit mode after saving
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User information not available",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/user/profile/delete?user_id=${user.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete account");
      }

      // Log the user out after successful deletion
      await logout();

      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted",
      });

      // Redirect to home page
      router.push("/");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Function to get program name from program_id
  const getProgramName = () => {
    if (!profileData.program_id && !user?.program?.name) return "Not specified";

    if (user?.program?.name) return user.program.name;

    const program = programs.find((p) => p.id === profileData.program_id);
    return program ? program.name : "Not specified";
  };

  // Function to get education level from is_undergrad
  const getEducationLevel = () => {
    if (user?.program?.is_undergrad !== undefined) {
      return user.program.is_undergrad ? "Undergraduate" : "Graduate";
    }
    return profileData.is_undergrad ? "Undergraduate" : "Graduate";
  };

  // Function to get faculty name
  const getFacultyName = () => {
    return user?.program?.faculty || profileData.faculty || "Not specified";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#111518]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#191f23] text-white p-6 md:p-10">
      <div className="md:max-w-4xl md:mx-auto mb-8">
        <div className="flex justify-between items-center">
          {" "}
          <div className="flex items-center">
            <Logo />
          </div>
          <Button
            variant="ghost"
            className="flex items-center gap-2 hover:bg-[#1e2329]"
            onClick={() => router.push("/home")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left column - Profile picture and buttons */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <ProfilePhoto username={profileData.username} />
              {/* Online indicator */}
              <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-green-500 border-2 border-[#111518]"></div>
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full border-gray-700 text-gray-300 hover:bg-[#1e2329] hover:text-yellow-500"
              onClick={() => setIsEditing(false)}
            >
              <X className="mr-2 h-4 w-4" /> Discard
            </Button>

            {!isEditing && (
              <Button variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Profile
              </Button>
            )}
          </div>

          {/* Right column - Profile information */}
          <div className="md:col-span-2 space-y-8">
            <div className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-400">
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  value={profileData.username}
                  onChange={handleChange}
                  className="bg-[#191f23] border-gray-700 text-white"
                />
              </div>

              <div>
                <Label
                  htmlFor="education_level"
                  className="text-gray-400 block mb-2"
                >
                  Education Level
                </Label>
                <Select
                  value={
                    profileData.is_undergrad ? "Undergraduate" : "Graduate"
                  }
                  onValueChange={handleEducationLevelChange}
                >
                  <SelectTrigger
                    id="education_level"
                    className="bg-[#191f23] border-gray-700 text-white w-full md:w-auto"
                  >
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e2329] border-gray-700">
                    <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                    <SelectItem value="Graduate">Graduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="faculty" className="text-gray-400">
                  Faculty
                </Label>
                <Select
                  value={profileData.faculty}
                  onValueChange={handleFacultyChange}
                  disabled={isLoadingPrograms}
                >
                  <SelectTrigger
                    id="faculty"
                    className="bg-[#191f23] border-gray-700 text-white w-full"
                  >
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e2329] border-gray-700 max-h-60">
                    {faculties.map((faculty) => (
                      <SelectItem key={faculty.name} value={faculty.name}>
                        {faculty.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="program" className="text-gray-400">
                  Program
                </Label>
                <Select
                  value={profileData.program_id}
                  onValueChange={handleProgramChange}
                  disabled={!profileData.faculty || isLoadingPrograms}
                >
                  <SelectTrigger
                    id="program"
                    className="bg-[#191f23] border-gray-700 text-white w-full"
                  >
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e2329] border-gray-700 max-h-60">
                    {filteredPrograms.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {profileData.faculty &&
                  filteredPrograms.length === 0 &&
                  !isLoadingPrograms && (
                    <p className="text-xs text-red-400">
                      No{" "}
                      {profileData.is_undergrad ? "undergraduate" : "graduate"}{" "}
                      programs found for this faculty.
                    </p>
                  )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-400 line-through">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-[#191f23] border-gray-700 text-gray-400"
                  />
                  <p className="text-xs text-gray-500">
                    Your email cannot be changed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full md:max-w-4xl md:mx-auto">
          <CardContainer className="inter-var">
            <CardBody className="bg-[#1e2329] relative group/card border-white/[0.2] w-full h-auto rounded-xl p-6 md:p-12 border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-24">
                {/* Left column inside card - Profile picture */}
                <CardItem
                  translateZ="40"
                  className="flex flex-col items-center gap-4 md:gap-6"
                >
                  <div className="relative">
                    <ProfilePhoto username={profileData.username} />
                    {/* Online indicator */}
                    <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 w-3 h-3 md:w-4 md:h-4 rounded-full bg-green-500 border-2 border-[#111518]"></div>
                  </div>

                  <div className="w-full flex flex-col gap-2 md:gap-4">
                    <CardItem translateZ="50" className="w-full">
                      <Button
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base"
                        onClick={() => setIsEditing(true)}
                      >
                        <PenLine className="mr-2 h-3 w-3 md:h-4 md:w-4" /> Edit
                        Profile
                      </Button>
                    </CardItem>

                    <CardItem translateZ="50" className="w-full">
                      <Button
                        variant="outline"
                        className="w-full border-gray-700 text-gray-300 hover:bg-[#1e2329] hover:text-destructive text-sm md:text-base"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <LogOut className="mr-2 h-3 w-3 md:h-4 md:w-4" /> Delete
                        Account
                      </Button>
                    </CardItem>
                  </div>
                </CardItem>

                {/* Right column inside card - Profile information */}
                <CardItem
                  translateZ="40"
                  className="md:col-span-2 space-y-6 md:space-y-8"
                >
                  <div className="space-y-1 md:space-y-2">
                    <CardItem
                      translateZ="60"
                      className="text-xl md:text-3xl font-bold text-white"
                    >
                      {profileData.username}
                    </CardItem>

                    <CardItem
                      translateZ="50"
                      className="text-sm md:text-base text-gray-400"
                    >
                      {user?.email}
                    </CardItem>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                    <CardItem
                      translateZ="70"
                      className="space-y-1 md:space-y-2"
                    >
                      <h3 className="text-xs md:text-sm text-gray-500">
                        Education Level
                      </h3>
                      <div className="bg-[#a6d68d] text-white inline-block px-2 py-1 md:px-3 md:py-1 rounded-md text-xs md:text-sm">
                        {getEducationLevel()}
                      </div>
                    </CardItem>

                    <CardItem
                      translateZ="70"
                      className="space-y-1 md:space-y-2"
                    >
                      <h3 className="text-xs md:text-sm text-gray-500">
                        Faculty
                      </h3>
                      <div className="bg-[#f66a6a] text-white inline-block px-2 py-1 md:px-3 md:py-1 rounded-md text-xs md:text-sm">
                        {getFacultyName()}
                      </div>
                    </CardItem>
                  </div>

                  <CardItem translateZ="80" className="space-y-1 md:space-y-2">
                    <h3 className="text-xs md:text-sm text-gray-500">
                      Program
                    </h3>
                    <div className="bg-[#5767e5] text-white inline-block px-2 py-1 md:px-3 md:py-1 rounded-md text-xs md:text-sm">
                      {getProgramName()}
                    </div>
                  </CardItem>
                </CardItem>
              </div>
            </CardBody>
          </CardContainer>
        </div>
      )}

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[#1e2329] border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#191f23] border-gray-700 text-white hover:bg-[#2a3137]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
