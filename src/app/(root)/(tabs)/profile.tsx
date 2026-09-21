import { useAuth, useUser } from "@clerk/expo";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useSupabase } from "../../../../hooks/useSupabase";

const Profile = () => {
  const { signOut } = useAuth();
  const { user } = useUser();

  const supabase = useSupabase();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";

  // Sync Clerk user with Supabase
  useEffect(() => {
    if (!user) {
      return;
    }

    const syncProfile = async () => {
      // Check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("id, is_admin")
        .eq("clerk_user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.log("Profile check error:", fetchError.message);
        setIsCheckingAdmin(false);
        return;
      }

      if (existingProfile) {
        setIsAdmin(existingProfile.is_admin === true);
      }

      // Create profile if it doesn't exist
      if (!existingProfile) {
        const { error: insertError } = await supabase.from("profiles").insert({
          clerk_user_id: user.id,
          first_name: user.firstName ?? "",
          last_name: user.lastName ?? "",
          email: user.primaryEmailAddress?.emailAddress ?? "",
        });

        if (insertError) {
          console.log("Profile creation error:", insertError.message);
          setIsCheckingAdmin(false);
          return;
        }

        setIsAdmin(false);
        setIsCheckingAdmin(false);
        return;
      }

      // Update existing profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          first_name: user.firstName ?? "",
          last_name: user.lastName ?? "",
          email: user.primaryEmailAddress?.emailAddress ?? "",
        })
        .eq("clerk_user_id", user.id);

      if (updateError) {
        console.log("Profile update error:", updateError.message);
        setIsCheckingAdmin(false);
        return;
      }

      setIsCheckingAdmin(false);
    };

    syncProfile();
  }, [user, supabase]);

  // Open Admin Panel
  const handleAdminPanel = () => {
    router.push("/(root)/admin");
  };

  // Sign out
  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await signOut();

      router.replace("/(auth)/sign-in");
    } catch {
      Alert.alert("Sign Out Failed", "Something went wrong while signing out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  // Back to Home
  const handleBackToHome = () => {
    router.replace("/(root)/(tabs)");
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 justify-center px-5 py-10">
        {/* Profile */}
        <View className="items-center">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-blue-100">
            <Text className="text-3xl font-bold text-blue-600">{initials}</Text>
          </View>

          <Text className="mt-4 text-xl font-bold text-slate-900">
            {firstName} {lastName}
          </Text>

          <Text className="mt-1 text-sm text-slate-500">{email}</Text>
        </View>

        {/* User Details Card */}
        <View className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <Text className="mb-5 text-lg font-semibold text-slate-900">
            Account details
          </Text>

          {/* First Name */}
          <View>
            <Text className="text-xs font-medium uppercase text-slate-400">
              First name
            </Text>

            <Text className="mt-1 text-base font-medium text-slate-900">
              {firstName || "Not provided"}
            </Text>
          </View>

          {/* Last Name */}
          <View className="mt-5">
            <Text className="text-xs font-medium uppercase text-slate-400">
              Last name
            </Text>

            <Text className="mt-1 text-base font-medium text-slate-900">
              {lastName || "Not provided"}
            </Text>
          </View>

          {/* Email */}
          <View className="mt-5">
            <Text className="text-xs font-medium uppercase text-slate-400">
              Email address
            </Text>

            <Text className="mt-1 text-base font-medium text-slate-900">
              {email || "Not provided"}
            </Text>
          </View>
        </View>

        {/* Admin Panel */}
        {!isCheckingAdmin && isAdmin && (
          <Pressable
            className="mt-7 h-14 flex-row items-center justify-center rounded-xl bg-slate-900 active:bg-slate-800"
            onPress={handleAdminPanel}
          >
            <Text className="text-base font-semibold text-white">
              Admin Panel
            </Text>
          </Pressable>
        )}

        {/* Back to Home */}
        <Pressable
          className={`h-14 items-center justify-center rounded-xl border border-blue-600 bg-white active:bg-blue-50 ${
            !isCheckingAdmin && isAdmin ? "mt-4" : "mt-7"
          }`}
          onPress={handleBackToHome}
        >
          <Text className="text-base font-semibold text-blue-600">
            Back to Home
          </Text>
        </Pressable>

        {/* Log Out */}
        <Pressable
          className={`mt-4 h-14 items-center justify-center rounded-xl ${
            isSigningOut ? "bg-red-300" : "bg-red-500 active:bg-red-600"
          }`}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-base font-semibold text-white">Log Out</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
};

export default Profile;
