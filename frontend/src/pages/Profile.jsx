import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { Camera, Mail, User, MessageSquare, Save, X } from "lucide-react";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile, onlineUsers } =
    useAuthStore();
  const { selectedUser } = useChatStore();
  const user = selectedUser || authUser;
  const isOnline = onlineUsers.includes(user?._id);
  console.log("authUser:", authUser);
  console.log("createdAt:", authUser?.createdAt);
  // const { updateBio,  }
  const [selectedImg, setSelectedImg] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, WebP, or GIF)");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };

    reader.onerror = () => {
      toast.error("Failed to read the image file");
    };
  };

  const handleSaveProfile = async () => {
    if (!formData.fullName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    if (formData.bio.length > 150) {
      toast.error("Bio must be 150 characters or less");
      return;
    }

    try {
      await updateProfile({
        fullName: formData.fullName,
        bio: formData.bio,
      });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: authUser?.fullName || "",
      bio: authUser?.bio || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="h-auto py-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-200/50 border border-base-300 rounded-box p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>

          {/* Avatar upload section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4"
              />
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0 
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                `}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              {isUpdatingProfile
                ? "Uploading..."
                : "Click the camera icon to update your photo"}
            </p>
          </div>

          {/* Profile information */}
          <div className="space-y-6">
            {/* Full Name */}
            <div className="space-y-1.5">
              <div className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-base-200 rounded-lg border border-base-300 focus:outline-none focus:border-primary"
                  placeholder="Enter your name"
                />
              ) : (
                <p className="px-4 py-2.5 bg-base-200 rounded-lg border border-base-300">
                  {authUser?.fullName}
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <div className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Bio
              </div>
              {isEditing ? (
                <div className="relative">
                  <textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-base-200 rounded-lg border border-base-300 focus:outline-none focus:border-primary resize-none"
                    placeholder="Tell us about yourself..."
                    rows={3}
                    maxLength={150}
                  />
                  <div className="text-xs text-zinc-400 mt-1 text-right">
                    {formData.bio.length}/150
                  </div>
                </div>
              ) : (
                <p className="px-4 py-2.5 bg-base-200 rounded-lg border border-base-300 min-h-[60px]">
                  {authUser?.bio || "No bio yet"}
                </p>
              )}
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-1.5">
              <div className="text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border border-base-300">
                {authUser?.email}
              </p>
            </div>
          </div>

          {/* Edit/Save Buttons */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveProfile}
                  disabled={isUpdatingProfile}
                  className="flex-1 btn btn-primary"
                >
                  <Save className="w-4 h-4" />
                  {isUpdatingProfile ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isUpdatingProfile}
                  className="btn btn-ghost"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full btn btn-primary"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Account Information */}
          <div className="mt-6 bg-base-200 border border-base-300 rounded-box p-6">
            <h2 className="text-lg font-medium mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-base-300">
                <span>Member Since</span>
                <span>
                  {(() => {
                    try {
                      // Try to parse the date from various possible formats
                      const dateValue =
                        authUser?.createdAt ||
                        authUser?.user?.createdAt ||
                        authUser?.data?.createdAt;

                      if (!dateValue) return "Unknown";

                      // Handle both string timestamps and Firestore timestamps
                      const date = dateValue.toDate
                        ? dateValue.toDate()
                        : new Date(dateValue);

                      if (isNaN(date.getTime())) return "Invalid date";

                      return date.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      });
                    } catch (error) {
                      console.error("Error formatting date:", error);
                      return "Date error";
                    }
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span
                  className={`${isOnline ? "text-green-500 bg-green-500/10 border-green-500" : "text-green-500 bg-green-500/10 border-green-500"} border px-2 py-1 rounded-full text-xs`}
                >
                  {isOnline ? "Active" : "Active"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
