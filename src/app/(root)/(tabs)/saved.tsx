import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  description: string | null;
  price: number;
  type: string;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number | null;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  is_featured: boolean;
  is_sold: boolean;
  created_at: string;
  clerk_user_id: string;
};

type SavedProperty = {
  id: string;
  property_id: string;
  created_at: string;
};

const Saved = () => {
  const { user } = useUser();
  const supabase = useSupabase();

  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // --------------------------------
  // Fetch saved properties
  // --------------------------------

  const fetchSavedProperties = async () => {
    if (!user?.id) {
      setProperties([]);
      setIsLoading(false);
      return;
    }

    try {
      // First get the user's saved property records
      const { data: savedData, error: savedError } = await supabase
        .from("saved_properties")
        .select("id, property_id, created_at")
        .eq("clerk_user_id", user.id)
        .order("created_at", { ascending: false });

      if (savedError) {
        console.log("Fetch saved properties error:", savedError.message);

        return;
      }

      const savedProperties = (savedData ?? []) as SavedProperty[];

      // No saved properties
      if (savedProperties.length === 0) {
        setProperties([]);
        return;
      }

      const propertyIds = savedProperties.map((saved) => saved.property_id);

      // Get the actual properties
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .in("id", propertyIds);

      if (propertyError) {
        console.log("Fetch property details error:", propertyError.message);

        return;
      }

      const fetchedProperties = (propertyData ?? []) as Property[];

      // Keep the same order as saved_properties
      const propertyMap = new Map(
        fetchedProperties.map((property) => [property.id, property]),
      );

      const orderedProperties = propertyIds
        .map((propertyId) => propertyMap.get(propertyId))
        .filter((property): property is Property => property !== undefined);

      setProperties(orderedProperties);
    } catch (error) {
      console.log("Unexpected saved properties error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------
  // Load whenever Saved tab opens
  // --------------------------------

  useFocusEffect(
    useCallback(() => {
      fetchSavedProperties();
    }, [user?.id, supabase]),
  );

  // --------------------------------
  // Pull to refresh
  // --------------------------------

  const handleRefresh = async () => {
    setIsRefreshing(true);

    await fetchSavedProperties();

    setIsRefreshing(false);
  };

  // --------------------------------
  // Remove saved property
  // --------------------------------

  const removeSavedProperty = async (propertyId: string) => {
    if (!user?.id || removingId) return;

    setRemovingId(propertyId);

    try {
      const { error } = await supabase
        .from("saved_properties")
        .delete()
        .eq("clerk_user_id", user.id)
        .eq("property_id", propertyId);

      if (error) {
        console.log("Remove saved property error:", error.message);

        Alert.alert("Error", "Could not remove this property from saved.");

        return;
      }

      // Immediately remove it from the UI
      setProperties((currentProperties) =>
        currentProperties.filter((property) => property.id !== propertyId),
      );
    } catch (error) {
      console.log("Unexpected remove saved error:", error);

      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  // --------------------------------
  // Format price
  // --------------------------------

  const formatPrice = (price: number) => {
    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  // --------------------------------
  // Loading
  // --------------------------------

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />

        <Text className="mt-3 text-sm text-slate-500">
          Loading saved properties...
        </Text>
      </View>
    );
  }

  // --------------------------------
  // Main screen
  // --------------------------------

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={{
        paddingBottom: 30,
      }}
    >
      {/* Header */}

      <View className="px-5 pb-4 pt-5">
        <Text className="text-3xl font-bold text-slate-900">Saved</Text>

        <Text className="mt-1 text-sm text-slate-500">
          Properties you've saved for later
        </Text>
      </View>

      {/* Empty state */}

      {properties.length === 0 && (
        <View className="items-center px-8 pb-10 pt-20">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            <Ionicons name="heart-outline" size={40} color="#94A3B8" />
          </View>

          <Text className="mt-5 text-xl font-bold text-slate-900">
            No saved properties
          </Text>

          <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
            Properties you save will appear here. Start exploring and save the
            ones you like.
          </Text>

          <Pressable
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3.5 active:bg-blue-700"
            onPress={() => router.push("/properties")}
          >
            <Text className="font-semibold text-white">Explore Properties</Text>
          </Pressable>
        </View>
      )}

      {/* Saved properties */}

      {properties.length > 0 && (
        <View className="px-5">
          <Text className="mb-3 text-base font-semibold text-slate-700">
            {properties.length}{" "}
            {properties.length === 1 ? "Saved Property" : "Saved Properties"}
          </Text>

          <View className="gap-4">
            {properties.map((property) => (
              <Pressable
                key={property.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white active:bg-slate-50"
                onPress={() =>
                  router.push({
                    pathname: "/property/[id]",
                    params: {
                      id: property.id,
                    },
                  })
                }
              >
                {/* Image placeholder */}

                <View className="h-44 items-center justify-center bg-slate-100">
                  <Text className="text-sm font-medium text-slate-400">
                    Property Image
                  </Text>

                  {/* Featured badge */}

                  {property.is_featured && (
                    <View className="absolute left-3 top-3 rounded-full bg-yellow-100 px-3 py-1">
                      <Text className="text-xs font-semibold text-yellow-700">
                        Featured
                      </Text>
                    </View>
                  )}

                  {/* Sold badge */}

                  {property.is_sold && (
                    <View className="absolute right-3 top-3 rounded-full bg-red-100 px-3 py-1">
                      <Text className="text-xs font-semibold text-red-700">
                        Sold
                      </Text>
                    </View>
                  )}
                </View>

                {/* Property information */}

                <View className="p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="mr-3 flex-1">
                      <Text
                        className="text-lg font-bold text-slate-900"
                        numberOfLines={1}
                      >
                        {property.title}
                      </Text>

                      <Text
                        className="mt-1 text-sm text-slate-500"
                        numberOfLines={1}
                      >
                        {property.address}, {property.city}
                      </Text>
                    </View>

                    {/* Remove saved */}

                    <Pressable
                      className="h-10 w-10 items-center justify-center rounded-full bg-red-50"
                      onPress={(event) => {
                        event.stopPropagation();
                        removeSavedProperty(property.id);
                      }}
                      disabled={removingId === property.id}
                    >
                      {removingId === property.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Ionicons name="heart" size={21} color="#EF4444" />
                      )}
                    </Pressable>
                  </View>

                  {/* Price */}

                  <Text className="mt-3 text-xl font-bold text-blue-600">
                    {formatPrice(property.price)}
                  </Text>

                  {/* Summary */}

                  <View className="mt-3 flex-row items-center">
                    <Text className="text-sm text-slate-600">
                      {property.bedrooms} Beds
                    </Text>

                    <View className="mx-3 h-1 w-1 rounded-full bg-slate-300" />

                    <Text className="text-sm text-slate-600">
                      {property.bathrooms} Baths
                    </Text>

                    {property.area_sqft && (
                      <>
                        <View className="mx-3 h-1 w-1 rounded-full bg-slate-300" />

                        <Text className="text-sm text-slate-600">
                          {property.area_sqft} sqft
                        </Text>
                      </>
                    )}
                  </View>

                  {/* Type */}

                  <Text className="mt-2 text-sm capitalize text-slate-400">
                    {property.type}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default Saved;
