import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
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

const PropertyDetails = () => {
  const { user } = useUser();
  const { id } = useLocalSearchParams<{ id: string }>();

  const supabase = useSupabase();

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProperty = async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.log("Fetch property error:", error.message);
      setIsLoading(false);
      return;
    }

    setProperty(data);
    setIsLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchProperty();
    }, [id]),
  );

  const checkIfSaved = async () => {
    if (!id || !user?.id) return;

    const { data, error } = await supabase
      .from("saved_properties")
      .select("id")
      .eq("clerk_user_id", user.id)
      .eq("property_id", id)
      .maybeSingle();

    if (error) {
      console.log("Check saved property error:", error.message);
      return;
    }

    setIsSaved(!!data);
  };

  useEffect(() => {
    checkIfSaved();
  }, [id, user?.id, supabase]);

  const toggleSaved = async () => {
    if (!property || !user?.id || isSaving) return;

    setIsSaving(true);

    try {
      if (isSaved) {
        // Remove from saved
        const { error } = await supabase
          .from("saved_properties")
          .delete()
          .eq("clerk_user_id", user.id)
          .eq("property_id", property.id);

        if (error) {
          console.log("Unsave property error:", error.message);

          Alert.alert("Error", "Could not remove this property from saved.");

          return;
        }

        setIsSaved(false);
      } else {
        // Add to saved
        const { error } = await supabase.from("saved_properties").insert({
          clerk_user_id: user.id,
          property_id: property.id,
        });

        if (error) {
          console.log("Save property error:", error.message);

          Alert.alert("Error", "Could not save this property.");

          return;
        }

        setIsSaved(true);
      }
    } catch (error) {
      console.log("Toggle saved error:", error);

      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const isMyProperty = property !== null && property.clerk_user_id === user?.id;

  const handleEdit = () => {
    if (!property) return;

    router.push({
      pathname: "/property/edit",
      params: {
        id: property.id,
      },
    });
  };

  const handleDelete = () => {
    if (!property) return;

    Alert.alert(
      "Delete Property",
      "Are you sure you want to delete this property? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: deleteProperty,
        },
      ],
    );
  };

  const deleteProperty = async () => {
    if (!property) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", property.id);

      if (error) {
        console.log("Delete property error:", error.message);

        Alert.alert(
          "Delete Failed",
          "Could not delete this property. Please try again.",
        );

        return;
      }

      Alert.alert("Success", "Property deleted successfully.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.log("Unexpected delete error:", error);

      Alert.alert("Error", "Something went wrong while deleting the property.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />

        <Text className="mt-3 text-sm text-slate-500">Loading property...</Text>
      </View>
    );
  }

  if (!property) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-5">
        <Text className="text-xl font-bold text-slate-900">
          Property not found
        </Text>

        <Text className="mt-2 text-center text-sm text-slate-500">
          This property may have been removed.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 40,
      }}
    >
      {/* Image placeholder */}

      <View className="h-64 items-center justify-center bg-slate-100">
        <Text className="text-sm font-medium text-slate-400">
          Property Image
        </Text>
      </View>

      <View className="p-5">
        {/* Status */}

        <View className="flex-row flex-wrap items-center">
          {isMyProperty && (
            <View className="mr-2 rounded-full bg-blue-100 px-3 py-1">
              <Text className="text-xs font-semibold text-blue-700">
                Your Property
              </Text>
            </View>
          )}

          {property.is_featured && (
            <View className="mr-2 rounded-full bg-yellow-100 px-3 py-1">
              <Text className="text-xs font-semibold text-yellow-700">
                Featured
              </Text>
            </View>
          )}

          {property.is_sold && (
            <View className="rounded-full bg-red-100 px-3 py-1">
              <Text className="text-xs font-semibold text-red-700">Sold</Text>
            </View>
          )}
        </View>

        {/* Title + Save */}

        <View className="mt-4 flex-row items-start justify-between">
          <Text className="mr-4 flex-1 text-2xl font-bold text-slate-900">
            {property.title}
          </Text>

          <Pressable
            onPress={toggleSaved}
            disabled={isSaving}
            className="h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Ionicons
                name={isSaved ? "heart" : "heart-outline"}
                size={25}
                color={isSaved ? "#EF4444" : "#64748B"}
              />
            )}
          </Pressable>
        </View>

        {/* Price */}

        <Text className="mt-2 text-2xl font-bold text-blue-600">
          {formatPrice(property.price)}
        </Text>

        {/* Location */}

        <Text className="mt-2 text-base text-slate-500">
          {property.address}, {property.city}
        </Text>

        {/* Property summary */}

        <View className="mt-6 flex-row rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <View className="flex-1 items-center">
            <Text className="text-lg font-bold text-slate-900">
              {property.bedrooms}
            </Text>

            <Text className="mt-1 text-xs text-slate-500">Bedrooms</Text>
          </View>

          <View className="w-px bg-slate-200" />

          <View className="flex-1 items-center">
            <Text className="text-lg font-bold text-slate-900">
              {property.bathrooms}
            </Text>

            <Text className="mt-1 text-xs text-slate-500">Bathrooms</Text>
          </View>

          <View className="w-px bg-slate-200" />

          <View className="flex-1 items-center">
            <Text className="text-lg font-bold capitalize text-slate-900">
              {property.type}
            </Text>

            <Text className="mt-1 text-xs text-slate-500">Type</Text>
          </View>

          {property.area_sqft && (
            <>
              <View className="w-px bg-slate-200" />

              <View className="flex-1 items-center">
                <Text className="text-lg font-bold text-slate-900">
                  {property.area_sqft}
                </Text>

                <Text className="mt-1 text-xs text-slate-500">Sqft</Text>
              </View>
            </>
          )}
        </View>

        {/* Description */}

        <View className="mt-7">
          <Text className="text-lg font-bold text-slate-900">Description</Text>

          <Text className="mt-2 text-base leading-6 text-slate-600">
            {property.description || "No description available."}
          </Text>
        </View>

        {/* Address */}

        <View className="mt-7">
          <Text className="text-lg font-bold text-slate-900">Address</Text>

          <Text className="mt-2 text-base leading-6 text-slate-600">
            {property.address}
          </Text>

          <Text className="mt-1 text-base text-slate-600">{property.city}</Text>
        </View>

        {/* Coordinates */}

        {(property.latitude !== null || property.longitude !== null) && (
          <View className="mt-7">
            <Text className="text-lg font-bold text-slate-900">Location</Text>

            {property.latitude !== null && (
              <Text className="mt-2 text-sm text-slate-500">
                Latitude: {property.latitude}
              </Text>
            )}

            {property.longitude !== null && (
              <Text className="mt-1 text-sm text-slate-500">
                Longitude: {property.longitude}
              </Text>
            )}
          </View>
        )}

        {/* Owner Actions */}

        {isMyProperty && (
          <View className="mt-8">
            <Text className="mb-3 text-lg font-bold text-slate-900">
              Manage Property
            </Text>

            {/* Edit */}

            <Pressable
              className="h-14 items-center justify-center rounded-xl bg-blue-600 active:bg-blue-700"
              onPress={handleEdit}
              disabled={isDeleting}
            >
              <Text className="text-base font-semibold text-white">
                Edit Property
              </Text>
            </Pressable>

            {/* Delete */}

            <Pressable
              className={`mt-3 h-14 items-center justify-center rounded-xl border border-red-500 ${
                isDeleting ? "bg-red-50" : "bg-white active:bg-red-50"
              }`}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <Text className="text-base font-semibold text-red-500">
                  Delete Property
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default PropertyDetails;
