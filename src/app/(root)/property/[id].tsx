import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as ExpoLinking from "expo-linking";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useSupabase } from "../../../../hooks/useSupabase";
import MapView, { Marker } from "react-native-maps";

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

  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Full-screen image viewer
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);

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
    setCurrentImageIndex(0);
    setIsLoading(false);

    if (data?.clerk_user_id) {
      await fetchOwnerEmail(data.clerk_user_id);
    } else {
      setOwnerEmail(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProperty();
    }, [id]),
  );

  const fetchOwnerEmail = async (ownerClerkUserId: string) => {
    const { data, error } = await supabase.rpc("get_property_owner_email", {
      owner_clerk_user_id: ownerClerkUserId,
    });

    if (error) {
      console.log("Fetch owner email error:", error.message);
      setOwnerEmail(null);
      return;
    }

    setOwnerEmail(data ?? null);
  };

  const checkIfSaved = async () => {
    if (!id || !user?.id) {
      return;
    }

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
    if (!property || !user?.id || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      if (isSaved) {
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

  const handleContactOwner = async () => {
    if (!property || !ownerEmail) {
      Alert.alert(
        "Owner email unavailable",
        "The owner's email address is not available right now.",
      );

      return;
    }

    const subject = `Inquiry about ${property.title}`;

    const body = `Hi,

I am interested in your property "${property.title}" listed on KRIBB.

I would like to know more about the property.

Thank you.`;

    const mailUrl =
      `mailto:${ownerEmail}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    try {
      const canOpen = await ExpoLinking.canOpenURL(mailUrl);

      if (!canOpen) {
        Alert.alert(
          "Email App Not Available",
          "No email app is available on this device.",
        );

        return;
      }

      await ExpoLinking.openURL(mailUrl);
    } catch (error) {
      console.log("Open email error:", error);

      Alert.alert("Error", "Could not open the email app.");
    }
  };

  const handleOpenMap = async () => {
    if (
      property?.latitude === null ||
      property?.latitude === undefined ||
      property?.longitude === null ||
      property?.longitude === undefined
    ) {
      return;
    }

    const { latitude, longitude } = property;

    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    try {
      await ExpoLinking.openURL(url);
    } catch (error) {
      console.log("Open map error:", error);

      Alert.alert("Error", "Could not open Google Maps.");
    }
  };

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const isMyProperty = property !== null && property.clerk_user_id === user?.id;

  const handleEdit = () => {
    if (!property) {
      return;
    }

    router.push({
      pathname: "/property/edit",
      params: {
        id: property.id,
      },
    });
  };

  const handleDelete = () => {
    if (!property) {
      return;
    }

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

  const getStoragePathFromUrl = (url: string) => {
    const marker = "/storage/v1/object/public/property-images/";

    const index = url.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(url.substring(index + marker.length));
  };

  const deleteProperty = async () => {
    if (!property || !user?.id) {
      return;
    }

    setIsDeleting(true);

    try {
      const storagePaths = (property.images ?? [])
        .map(getStoragePathFromUrl)
        .filter((path): path is string => path !== null);

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("property-images")
          .remove(storagePaths);

        if (storageError) {
          console.log("Delete property images error:", storageError.message);

          Alert.alert(
            "Delete Failed",
            "Could not delete the property images. The property was not deleted.",
          );

          return;
        }
      }

      const { error: deleteError } = await supabase
        .from("properties")
        .delete()
        .eq("id", property.id)
        .eq("clerk_user_id", user.id);

      if (deleteError) {
        console.log("Delete property error:", deleteError.message);

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

  // Open full-screen image viewer
  const openImageViewer = (index: number) => {
    setViewerImageIndex(index);
    setIsImageViewerVisible(true);
  };

  // Close full-screen image viewer
  const closeImageViewer = () => {
    setIsImageViewerVisible(false);
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

  const propertyImages = property.images ?? [];

  return (
    <>
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >
        {/* Image Gallery */}

        {propertyImages.length > 0 ? (
          <View className="relative">
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const width = event.nativeEvent.layoutMeasurement.width;

                const offset = event.nativeEvent.contentOffset.x;

                const index = Math.round(offset / width);

                setCurrentImageIndex(index);
              }}
            >
              {propertyImages.map((image, index) => (
                <Pressable
                  key={`${image}-${index}`}
                  onPress={() => openImageViewer(index)}
                  className="w-screen"
                >
                  <Image
                    source={{ uri: image }}
                    className="h-64 w-screen bg-slate-100"
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>

            {/* Image Counter */}

            <View className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1.5">
              <Text className="text-xs font-semibold text-white">
                {currentImageIndex + 1} / {propertyImages.length}
              </Text>
            </View>

            {/* Image Dots */}

            {propertyImages.length > 1 && (
              <View className="absolute bottom-4 left-0 right-0 flex-row items-center justify-center">
                {propertyImages.map((_, index) => (
                  <View
                    key={index}
                    className={`mx-1 h-2 w-2 rounded-full ${
                      index === currentImageIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </View>
            )}

            {/* Tap Hint */}

            <View className="absolute left-4 top-4 flex-row items-center rounded-full bg-black/60 px-3 py-2">
              <Ionicons name="expand-outline" size={16} color="#FFFFFF" />

              <Text className="ml-1.5 text-xs font-semibold text-white">
                Tap to view
              </Text>
            </View>
          </View>
        ) : (
          <View className="h-64 items-center justify-center bg-slate-100">
            <Ionicons name="image-outline" size={48} color="#94A3B8" />

            <Text className="mt-2 text-sm font-medium text-slate-400">
              No images available
            </Text>
          </View>
        )}

        <View className="p-5">
          {/* Status */}

          <View className="flex-row flex-wrap items-center">
            {property.is_featured && (
              <View className="mr-2 rounded-full bg-yellow-100 px-3 py-1">
                <Text className="text-xs font-semibold text-yellow-700">
                  Featured
                </Text>
              </View>
            )}

            {isMyProperty && (
              <View className="mr-2 rounded-full bg-blue-100 px-3 py-1">
                <Text className="text-xs font-semibold text-blue-700">
                  My Property
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

          {/* Property Summary */}

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

          {/* Contact Owner */}

          {!isMyProperty && (
            <View className="mt-7">
              <Text className="mb-3 text-lg font-bold text-slate-900">
                Contact Owner
              </Text>

              <Pressable
                onPress={handleContactOwner}
                disabled={!ownerEmail}
                className={`h-14 flex-row items-center justify-center rounded-xl ${
                  ownerEmail ? "bg-blue-600 active:bg-blue-700" : "bg-slate-200"
                }`}
              >
                <Ionicons
                  name="mail-outline"
                  size={21}
                  color={ownerEmail ? "#FFFFFF" : "#94A3B8"}
                />

                <Text
                  className={`ml-2 text-base font-semibold ${
                    ownerEmail ? "text-white" : "text-slate-400"
                  }`}
                >
                  {ownerEmail ? "Contact Owner" : "Owner Email Unavailable"}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Description */}

          <View className="mt-7">
            <Text className="text-lg font-bold text-slate-900">
              Description
            </Text>

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

            <Text className="mt-1 text-base text-slate-600">
              {property.city}
            </Text>
          </View>

          {/* Property Location */}

          {property.latitude !== null && property.longitude !== null && (
            <View className="mt-7">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-slate-900">
                  Property Location
                </Text>

                <Pressable onPress={handleOpenMap}>
                  <Text className="text-sm font-semibold text-blue-600">
                    Open in Maps
                  </Text>
                </Pressable>
              </View>

              <View className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                <MapView
                  className="h-64 w-full"
                  initialRegion={{
                    latitude: property.latitude,
                    longitude: property.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: property.latitude,
                      longitude: property.longitude,
                    }}
                    title={property.title}
                    description={`${property.address}, ${property.city}`}
                  />
                </MapView>
              </View>

              <Text className="mt-2 text-xs text-slate-400">
                {property.latitude}, {property.longitude}
              </Text>
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

      {/* ===================================================== */}
      {/* FULL SCREEN IMAGE VIEWER */}
      {/* ===================================================== */}

      <Modal
        visible={isImageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <View className="flex-1 bg-black">
          {/* Close Button */}

          <Pressable
            onPress={closeImageViewer}
            className="absolute right-5 top-12 z-20 h-11 w-11 items-center justify-center rounded-full bg-black/60"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>

          {/* Image Counter */}

          <View className="absolute left-0 right-0 top-14 z-10 items-center">
            <View className="rounded-full bg-black/60 px-4 py-2">
              <Text className="text-sm font-semibold text-white">
                {viewerImageIndex + 1} / {propertyImages.length}
              </Text>
            </View>
          </View>

          {/* Full Screen Images */}

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const width = event.nativeEvent.layoutMeasurement.width;

              const offset = event.nativeEvent.contentOffset.x;

              const index = Math.round(offset / width);

              setViewerImageIndex(index);
            }}
            className="flex-1"
          >
            {propertyImages.map((image, index) => (
              <View
                key={`${image}-fullscreen-${index}`}
                className="w-screen flex-1 items-center justify-center"
              >
                <Image
                  source={{ uri: image }}
                  className="h-full w-full"
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* Bottom Image Counter */}

          {propertyImages.length > 1 && (
            <View className="absolute bottom-10 left-0 right-0 items-center">
              <View className="flex-row items-center rounded-full bg-black/60 px-4 py-2">
                {propertyImages.map((_, index) => (
                  <View
                    key={index}
                    className={`mx-1 h-2 w-2 rounded-full ${
                      index === viewerImageIndex ? "bg-white" : "bg-white/40"
                    }`}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
};

export default PropertyDetails;
