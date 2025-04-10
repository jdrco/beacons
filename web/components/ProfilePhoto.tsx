import React from "react";

interface ProfilePhotoProps {
  username: string;
  is_navbar?: boolean;
}

const ProfilePhoto: React.FC<ProfilePhotoProps> = ({
  username,
  is_navbar = false,
}) => {
  const generateInitials = (name: string): string => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  if (is_navbar) {
    return (
      <div
        className="w-7 h-7 text-xl rounded-full bg-gradient-to-br from-[#4AA69D] via-[#DDAA5E] to-[#F66A6A] 
        flex items-center justify-center text-white font-light overflow-hidden"
      >
        {generateInitials(username)}
      </div>
    );
  }

  return (
    <div
      className="w-40 h-40 text-6xl rounded-full bg-gradient-to-br from-[#4AA69D] via-[#DDAA5E] to-[#F66A6A] 
      flex items-center justify-center text-white font-bold overflow-hidden"
    >
      {generateInitials(username)}
    </div>
  );
};

export default ProfilePhoto;
