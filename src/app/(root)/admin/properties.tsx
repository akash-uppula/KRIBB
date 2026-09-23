import { useUser } from "@clerk/expo";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type Filter = "all" | "featured" | "available" | "sold";

const AdminProperties = () => {
  const { user } = useUser();
  const supabase = useSupabase();

  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const checkAdmin = useCallback(async () => {
    if (!user?.id) {
      return false;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("clerk_user_id", user.id)
      .single();

    if (error) {
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

  const filteredProperties = useMemo(() => {
    const query = search.trim().toLowerCase();

    return properties.filter((property) => {
      const matchesSearch =
        !query ||
        property.title.toLowerCase().includes(query) ||
        property.city.toLowerCase().includes(query) ||
        property.address.toLowerCase().includes(query) ||
        property.type.toLowerCase().includes(query);

      if (!matchesSearch) {
        return false;
      }

      if (filter === "featured" && !property.is_featured) {
        return false;
      }

      if (filter === "available" && property.is_sold) {
        return false;
      }

      if (filter === "sold" && !property.is_sold) {
        return false;
      }

      return true;
    });
  }, [properties, search, filter]);

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

  const deleteProperty = (property: Property) => {
    Alert.alert(
      "Delete Property?",
      `Are you sure you want to permanently delete "${property.title}"?\n\nThis property will also be removed from all users' saved properties.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(property.id);

            const { error } = await supabase
              .from("properties")
              .delete()
              .eq("id", property.id);

            setDeletingId(null);

            if (error) {
              Alert.alert("Delete Failed", error.message);
              return;
            }

            setProperties((current) =>
              current.filter((item) => item.id !== property.id),
            );

            Alert.alert(
              "Property Deleted",
              "The property and its saved-property records have been removed.",
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
        {filteredProperties.length} of {properties.length} properties
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search properties..."
        placeholderTextColor="#94A3B8"
        className="mt-5 h-14 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-4"
      >
        <View className="flex-row gap-2">
          {[
            ["all", "All"],
            ["featured", "Featured"],
            ["available", "Available"],
            ["sold", "Sold"],
          ].map(([value, label]) => {
            const selected = filter === value;

            return (
              <Pressable
                key={value}
                onPress={() => setFilter(value as Filter)}
                className={`rounded-full border px-4 py-2 ${
                  selected
                    ? "border-blue-600 bg-blue-600"
                    : "border-slate-300 bg-white"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selected ? "text-white" : "text-slate-600"
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {filteredProperties.length === 0 ? (
        <View className="mt-6 items-center rounded-2xl border border-slate-200 bg-white p-8">
          <Text className="text-lg font-semibold text-slate-900">
            No properties found
          </Text>

          <Text className="mt-2 text-center text-sm text-slate-500">
            Try changing your search or filter.
          </Text>
        </View>
      ) : (
        <View className="mt-5 gap-5">
          {filteredProperties.map((property) => {
            const isUpdating = updatingId === property.id;
            const isDeleting = deletingId === property.id;

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

                  <View className="mt-5 flex-row gap-3">
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/admin/property-edit",
                          params: {
                            id: property.id,
                          },
                        })
                      }
                      className="flex-1 items-center rounded-xl border border-blue-600 bg-white py-3"
                    >
                      <Text className="font-semibold text-blue-600">Edit</Text>
                    </Pressable>

                    <Pressable
                      disabled={isUpdating}
                      onPress={() => toggleFeatured(property)}
                      className={`flex-1 items-center rounded-xl py-3 ${
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
                          {property.is_featured ? "Unfeature" : "Feature"}
                        </Text>
                      )}
                    </Pressable>
                  </View>

                  <Pressable
                    disabled={isDeleting}
                    onPress={() => deleteProperty(property)}
                    className={`mt-3 h-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 ${
                      isDeleting ? "opacity-60" : ""
                    }`}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Text className="font-semibold text-red-600">
                        Delete Property
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
