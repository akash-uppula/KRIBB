import { useUser } from "@clerk/expo";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useSupabase } from "../../../../hooks/useSupabase";

type Property = {
  id: string;
  title: string;
  price: number;
  type: string;
  city: string;
  address: string;
  images: string[];
  is_featured: boolean;
  is_sold: boolean;
  created_at: string;
};

const AdminProperties = () => {
  const { user } = useUser();
  const supabase = useSupabase();

  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const checkAdmin = useCallback(async () => {
    if (!user?.id) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("clerk_user_id", user.id)
      .single();

    if (error) {
      console.log("Admin check error:", error.message);
      setIsAdmin(false);
      return false;
    }

    const admin = data?.is_admin === true;
    setIsAdmin(admin);

    return admin;
  }, [supabase, user?.id]);

  const fetchProperties = useCallback(async () => {
    const { data, error } = await supabase
      .from("properties")
      .select(
        "id,title,price,type,city,address,images,is_featured,is_sold,created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Admin properties fetch error:", error.message);
      Alert.alert("Error", "Could not load properties.");
      return;
    }

    setProperties((data ?? []) as Property[]);
  }, [supabase]);

  useEffect(() => {
    const load = async () => {
      const admin = await checkAdmin();

      if (admin) {
        await fetchProperties();
      }

      setIsLoading(false);
    };

    load();
  }, [checkAdmin, fetchProperties]);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    const admin = await checkAdmin();

    if (admin) {
      await fetchProperties();
    }

    setIsRefreshing(false);
  };

  const toggleFeatured = (property: Property) => {
    const nextValue = !property.is_featured;

    Alert.alert(
      nextValue ? "Set as Featured?" : "Remove Featured?",
      nextValue
        ? `Make "${property.title}" a featured property?`
        : `Remove "${property.title}" from featured properties?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: nextValue ? "Set Featured" : "Remove",
          onPress: async () => {
            setUpdatingId(property.id);

            const { error } = await supabase
              .from("properties")
              .update({
                is_featured: nextValue,
              })
              .eq("id", property.id);

            setUpdatingId(null);

            if (error) {
              console.log("Featured update error:", error.message);
              Alert.alert("Update Failed", error.message);
              return;
            }

            setProperties((current) =>
              current.map((item) =>
                item.id === property.id
                  ? {
                      ...item,
                      is_featured: nextValue,
                    }
                  : item,
              ),
            );
          },
        },
      ],
    );
  };

  if (isLoading || isAdmin === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-3 text-sm text-slate-500">
          Loading admin properties...
        </Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-2xl font-bold text-slate-900">Access Denied</Text>

        <Text className="mt-2 text-center text-sm text-slate-500">
          Only administrators can manage properties.
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
    <ScrollView
      className="flex-1 bg-slate-50"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 40,
      }}
    >
      <Text className="text-2xl font-bold text-slate-900">
        Manage Properties
      </Text>

      <Text className="mt-1 text-sm text-slate-500">
        {properties.length}{" "}
        {properties.length === 1 ? "property" : "properties"} total
      </Text>

      {properties.length === 0 ? (
        <View className="mt-6 items-center rounded-2xl border border-slate-200 bg-white p-8">
          <Text className="text-lg font-semibold text-slate-900">
            No properties
          </Text>

          <Text className="mt-2 text-center text-sm text-slate-500">
            There are no properties to manage yet.
          </Text>
        </View>
      ) : (
        <View className="mt-5 gap-5">
          {properties.map((property) => {
            const isUpdating = updatingId === property.id;

            return (
              <View
                key={property.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                {property.images?.length > 0 ? (
                  <Image
                    source={{ uri: property.images[0] }}
                    className="h-48 w-full bg-slate-100"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-48 items-center justify-center bg-slate-100">
                    <Text className="text-sm text-slate-400">No Image</Text>
                  </View>
                )}

                <View className="p-5">
                  <View className="flex-row items-start justify-between">
                    <Text
                      className="mr-3 flex-1 text-lg font-bold text-slate-900"
                      numberOfLines={2}
                    >
                      {property.title}
                    </Text>

                    {property.is_featured && (
                      <View className="rounded-full bg-yellow-100 px-3 py-1">
                        <Text className="text-xs font-semibold text-yellow-700">
                          Featured
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text className="mt-2 text-xl font-bold text-blue-600">
                    ₹{Number(property.price).toLocaleString("en-IN")}
                  </Text>

                  <Text className="mt-2 text-sm text-slate-500">
                    {property.address}, {property.city}
                  </Text>

                  <View className="mt-3 flex-row items-center">
                    <Text className="text-sm font-medium capitalize text-slate-600">
                      {property.type}
                    </Text>

                    <Text className="mx-2 text-slate-300">•</Text>

                    <Text
                      className={`text-sm font-semibold ${
                        property.is_sold ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {property.is_sold ? "Sold" : "Available"}
                    </Text>
                  </View>

                  <Pressable
                    disabled={isUpdating}
                    onPress={() => toggleFeatured(property)}
                    className={`mt-5 items-center rounded-xl py-3 ${
                      property.is_featured
                        ? "border border-yellow-300 bg-yellow-50"
                        : "bg-blue-600"
                    } ${isUpdating ? "opacity-60" : ""}`}
                  >
                    {isUpdating ? (
                      <ActivityIndicator
                        size="small"
                        color={property.is_featured ? "#A16207" : "#FFFFFF"}
                      />
                    ) : (
                      <Text
                        className={`font-semibold ${
                          property.is_featured
                            ? "text-yellow-700"
                            : "text-white"
                        }`}
                      >
                        {property.is_featured
                          ? "Remove Featured"
                          : "Set as Featured"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

export default AdminProperties;
