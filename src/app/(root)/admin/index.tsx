import { useAuth, useUser } from "@clerk/expo";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useSupabase } from "../../../../hooks/useSupabase";

const AdminHome = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const supabase = useSupabase();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("clerk_user_id", user.id)
        .single();

      if (error) {
        console.log("Admin check error:", error.message);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(data?.is_admin === true);
    };

    checkAdmin();
  }, [supabase, user?.id]);

  if (!isLoaded || isAdmin === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-3 text-sm text-slate-500">
          Checking admin access...
        </Text>
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!isAdmin) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-2xl font-bold text-slate-900">Access Denied</Text>

        <Text className="mt-2 text-center text-sm text-slate-500">
          You do not have permission to access the admin panel.
        </Text>

        <Pressable
          onPress={() => router.replace("/(root)/(tabs)")}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-3"
        >
          <Text className="font-semibold text-white">Go Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 p-5">
      <Text className="text-2xl font-bold text-slate-900">Admin Panel</Text>

      <Text className="mt-1 text-sm text-slate-500">
        Manage KRIBB properties and featured listings.
      </Text>

      <Pressable
        onPress={() => router.push("/admin/properties")}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 active:bg-slate-50"
      >
        <Text className="text-lg font-bold text-slate-900">
          Manage Properties
        </Text>

        <Text className="mt-1 text-sm text-slate-500">
          Set properties as featured or remove them from featured listings.
        </Text>

        <Text className="mt-4 font-semibold text-blue-600">Open →</Text>
      </Pressable>
    </View>
  );
};

export default AdminHome;
