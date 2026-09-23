import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSupabase } from "../../../../hooks/useSupabase";

type Profile = {
  id: string;
  clerk_user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
};

type UserStats = {
  properties: number;
  saved: number;
};

const Users = () => {
  const { user } = useUser();
  const supabase = useSupabase();

  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Record<string, UserStats>>({});
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, clerk_user_id, first_name, last_name, email, avatar_url, is_admin, created_at",
        )
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert(
          "Unable to Load Users",
          `${error.message}\n\nCode: ${error.code ?? "N/A"}`,
        );
        return;
      }

      const profiles = (data ?? []) as Profile[];

      setUsers(profiles);

      if (profiles.length === 0) {
        setStats({});
        return;
      }

      const clerkUserIds = profiles.map((profile) => profile.clerk_user_id);

      const [propertiesResult, savedResult] = await Promise.all([
        supabase
          .from("properties")
          .select("clerk_user_id")
          .in("clerk_user_id", clerkUserIds),

        supabase
          .from("saved_properties")
          .select("clerk_user_id")
          .in("clerk_user_id", clerkUserIds),
      ]);

      const nextStats: Record<string, UserStats> = {};

      clerkUserIds.forEach((clerkUserId) => {
        nextStats[clerkUserId] = {
          properties: 0,
          saved: 0,
        };
      });

      if (!propertiesResult.error) {
        (propertiesResult.data ?? []).forEach((property) => {
          const clerkUserId = property.clerk_user_id;

          if (nextStats[clerkUserId]) {
            nextStats[clerkUserId].properties += 1;
          }
        });
      }

      if (!savedResult.error) {
        (savedResult.data ?? []).forEach((saved) => {
          const clerkUserId = saved.clerk_user_id;

          if (nextStats[clerkUserId]) {
            nextStats[clerkUserId].saved += 1;
          }
        });
      }

      setStats(nextStats);
    } catch {
      Alert.alert("Error", "Something went wrong while loading the users.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [supabase]),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
  };

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((profile) => {
      const fullName =
        `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();

      return (
        fullName.toLowerCase().includes(query) ||
        (profile.email ?? "").toLowerCase().includes(query) ||
        profile.clerk_user_id.toLowerCase().includes(query)
      );
    });
  }, [users, search]);

  const getFullName = (profile: Profile) => {
    const fullName =
      `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();

    return fullName || "Unnamed User";
  };

  const getInitial = (profile: Profile) => {
    const name = getFullName(profile);

    if (!name || name === "Unnamed User") {
      return "?";
    }

    return name.charAt(0).toUpperCase();
  };

  const toggleAdmin = async (profile: Profile) => {
    if (!user?.id || profile.clerk_user_id === user.id) {
      return;
    }

    const newAdminStatus = !profile.is_admin;

    const { error } = await supabase.rpc("admin_set_user_admin", {
      target_clerk_user_id: profile.clerk_user_id,
      new_admin_status: newAdminStatus,
    });

    if (error) {
      Alert.alert(
        "Update Failed",
        `${error.message}\n\nCode: ${error.code ?? "N/A"}`,
      );
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((item) =>
        item.clerk_user_id === profile.clerk_user_id
          ? {
              ...item,
              is_admin: newAdminStatus,
            }
          : item,
      ),
    );

    Alert.alert(
      newAdminStatus ? "Admin Added" : "Admin Removed",
      `${profile.first_name} ${profile.last_name} is ${
        newAdminStatus ? "now an administrator" : "no longer an administrator"
      }.`,
    );
  };

  const deleteUserData = async (profile: Profile) => {
    if (!user?.id) {
      Alert.alert(
        "Authentication Error",
        "Your current user session could not be found.",
      );
      return;
    }

    if (profile.clerk_user_id === user.id) {
      Alert.alert(
        "Action Not Allowed",
        "You cannot delete your own account data from Manage Users.",
      );
      return;
    }

    if (deletingUserId || updatingUserId) {
      return;
    }

    Alert.alert(
      "Delete User Data",
      `This will delete the Supabase profile for ${getFullName(
        profile,
      )}.\n\nThis does not delete the user's Clerk account.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingUserId(profile.clerk_user_id);

            try {
              const { error } = await supabase
                .from("profiles")
                .delete()
                .eq("clerk_user_id", profile.clerk_user_id);

              if (error) {
                Alert.alert(
                  "Delete Failed",
                  `${error.message}\n\nCode: ${error.code ?? "N/A"}${
                    error.details ? `\n\nDetails: ${error.details}` : ""
                  }${error.hint ? `\n\nHint: ${error.hint}` : ""}`,
                );
                return;
              }

              setUsers((currentUsers) =>
                currentUsers.filter(
                  (item) => item.clerk_user_id !== profile.clerk_user_id,
                ),
              );

              setStats((currentStats) => {
                const nextStats = { ...currentStats };
                delete nextStats[profile.clerk_user_id];
                return nextStats;
              });

              Alert.alert(
                "User Data Deleted",
                `The Supabase profile for ${getFullName(
                  profile,
                )} has been deleted.`,
              );
            } catch {
              Alert.alert(
                "Delete Failed",
                "Something went wrong while deleting the user data.",
              );
            } finally {
              setDeletingUserId(null);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />

        <Text className="mt-3 text-sm text-slate-500">Loading users...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={{
        paddingBottom: 40,
      }}
    >
      <View className="bg-white px-5 pb-5 pt-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-3xl font-bold text-slate-900">
              Manage Users
            </Text>

            <Text className="mt-1 text-sm text-slate-500">
              Manage registered users and admin access
            </Text>
          </View>

          <View className="ml-3 h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <Ionicons name="people-outline" size={25} color="#2563EB" />
          </View>
        </View>

        <View className="mt-5 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
          <Ionicons name="search-outline" size={20} color="#64748B" />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search users..."
            placeholderTextColor="#94A3B8"
            className="ml-3 h-12 flex-1 text-base text-slate-900"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch("")}
              className="ml-2 h-8 w-8 items-center justify-center rounded-full"
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      <View className="px-5 pt-5">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-slate-900">
            {filteredUsers.length}{" "}
            {filteredUsers.length === 1 ? "User" : "Users"}
          </Text>

          {search.length > 0 && (
            <Text className="text-sm text-slate-500">
              Showing search results
            </Text>
          )}
        </View>

        {filteredUsers.length === 0 ? (
          <View className="items-center rounded-2xl border border-slate-200 bg-white px-6 py-14">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Ionicons name="people-outline" size={32} color="#94A3B8" />
            </View>

            <Text className="mt-4 text-lg font-bold text-slate-900">
              No users found
            </Text>

            <Text className="mt-2 text-center text-sm text-slate-500">
              Try changing your search.
            </Text>
          </View>
        ) : (
          filteredUsers.map((profile) => {
            const isCurrentUser = profile.clerk_user_id === user?.id;

            const isUpdating = updatingUserId === profile.clerk_user_id;

            const isDeleting = deletingUserId === profile.clerk_user_id;

            const userStats = stats[profile.clerk_user_id] ?? {
              properties: 0,
              saved: 0,
            };

            return (
              <View
                key={profile.id}
                className="mb-4 rounded-2xl border border-slate-200 bg-white p-5"
              >
                <View className="flex-row items-start">
                  {profile.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      className="h-14 w-14 rounded-full"
                    />
                  ) : (
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                      <Text className="text-xl font-bold text-blue-600">
                        {getInitial(profile)}
                      </Text>
                    </View>
                  )}

                  <View className="ml-4 flex-1">
                    <View className="flex-row items-center">
                      <Text
                        className="mr-2 flex-1 text-base font-bold text-slate-900"
                        numberOfLines={1}
                      >
                        {getFullName(profile)}
                      </Text>

                      {profile.is_admin && (
                        <View className="rounded-full bg-blue-100 px-2.5 py-1">
                          <Text className="text-xs font-semibold text-blue-700">
                            Admin
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      className="mt-1 text-sm text-slate-500"
                      numberOfLines={1}
                    >
                      {profile.email || "No email"}
                    </Text>
                  </View>
                </View>

                <View className="mt-5 flex-row rounded-xl bg-slate-50 p-3">
                  <View className="flex-1 items-center">
                    <Text className="text-lg font-bold text-slate-900">
                      {userStats.properties}
                    </Text>

                    <Text className="mt-1 text-xs text-slate-500">
                      Properties
                    </Text>
                  </View>

                  <View className="w-px bg-slate-200" />

                  <View className="flex-1 items-center">
                    <Text className="text-lg font-bold text-slate-900">
                      {userStats.saved}
                    </Text>

                    <Text className="mt-1 text-xs text-slate-500">Saved</Text>
                  </View>
                </View>

                <View className="mt-4 rounded-xl border border-slate-200 p-3">
                  <Text className="text-xs font-medium text-slate-400">
                    Clerk User ID
                  </Text>

                  <Text
                    className="mt-1 text-xs text-slate-600"
                    numberOfLines={1}
                  >
                    {profile.clerk_user_id}
                  </Text>
                </View>

                {isCurrentUser && (
                  <View className="mt-3 flex-row items-center rounded-xl bg-blue-50 px-3 py-2.5">
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color="#2563EB"
                    />

                    <Text className="ml-2 flex-1 text-xs text-blue-700">
                      This is your current account.
                    </Text>
                  </View>
                )}

                <View className="mt-4 flex-row">
                  <Pressable
                    onPress={() => toggleAdmin(profile)}
                    disabled={isCurrentUser || isUpdating || isDeleting}
                    className={`flex-1 flex-row items-center justify-center rounded-xl px-3 py-3 ${
                      isCurrentUser
                        ? "bg-slate-100"
                        : profile.is_admin
                          ? "bg-orange-50"
                          : "bg-blue-600"
                    }`}
                  >
                    {isUpdating ? (
                      <ActivityIndicator
                        size="small"
                        color={profile.is_admin ? "#EA580C" : "#FFFFFF"}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name={
                            profile.is_admin
                              ? "shield-half-outline"
                              : "shield-checkmark-outline"
                          }
                          size={18}
                          color={
                            isCurrentUser
                              ? "#94A3B8"
                              : profile.is_admin
                                ? "#EA580C"
                                : "#FFFFFF"
                          }
                        />

                        <Text
                          className={`ml-2 text-sm font-semibold ${
                            isCurrentUser
                              ? "text-slate-400"
                              : profile.is_admin
                                ? "text-orange-600"
                                : "text-white"
                          }`}
                        >
                          {profile.is_admin ? "Remove Admin" : "Make Admin"}
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => deleteUserData(profile)}
                    disabled={isCurrentUser || isDeleting || isUpdating}
                    className={`ml-3 h-12 w-12 items-center justify-center rounded-xl border ${
                      isCurrentUser
                        ? "border-slate-200 bg-slate-100"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={isCurrentUser ? "#94A3B8" : "#DC2626"}
                      />
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

export default Users;
