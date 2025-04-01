"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { useRouter } from "next/navigation";
import { ArrowLeft, PenLine, LogOut, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated, logout, checkAuth } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [profileData, setProfileData] = useState({
    username: "",
    education_level: "",
  });

  useEffect(() => {
    // Load user data when available
    if (user) {
      setProfileData({
        username: user.username || "",
        education_level: user.education_level || "",
      });
    }
  }, [user]);

  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEducationChange = (value: string) => {
    setProfileData((prev) => ({
      ...prev,
      education_level: value,
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
      // Make API call to update user profile
      const response = await fetch("/api/user/profile/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          ...profileData,
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

  // Function to get first letter of username for avatar
  const getInitial = () => {
    return profileData.username
      ? profileData.username.charAt(0).toUpperCase()
      : "U";
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
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex justify-between items-center">
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

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column - Profile picture and buttons */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#4AA69D] via-[#DDAA5E] to-[#F66A6A] overflow-hidden flex items-center justify-center text-white text-6xl font-bold">
              {getInitial()}
            </div>
            {/* Online indicator */}
            <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-green-500 border-2 border-[#111518]"></div>
          </div>

          {!isEditing ? (
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setIsEditing(true)}
            >
              <PenLine className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          ) : (
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
          )}

          <Button
            variant="outline"
            className="w-full border-gray-700 text-gray-300 hover:bg-[#1e2329] hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <LogOut className="mr-2 h-4 w-4" /> Delete Account
          </Button>
        </div>

        {/* Right column - Profile information */}
        <div className="md:col-span-2 space-y-8">
          <div>
            {isEditing ? (
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
            ) : (
              <>
                <h1 className="text-2xl font-bold">{profileData.username}</h1>
                <p className="text-gray-400">{user?.email}</p>
              </>
            )}
          </div>

          <div>
            <h2 className="text-gray-500 mb-2">Education Level</h2>
            {isEditing ? (
              <Select
                value={profileData.education_level}
                onValueChange={handleEducationChange}
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
            ) : (
              <div className="bg-[#a6d68d] text-white inline-block px-3 py-1 rounded-md">
                {profileData.education_level || "Not specified"}
              </div>
            )}
          </div>

          {!isEditing && (
            <div>
              <h2 className="text-gray-500 mb-2">Email</h2>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="bg-[#5767e5] hover:bg-[#5767e5]/90 text-white"
                >
                  {user?.email}
                </Badge>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="bg-[#1e2329] p-6 rounded-lg">
              <h2 className="text-xl font-medium mb-4">Account Information</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
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
          )}
        </div>
      </div>

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
