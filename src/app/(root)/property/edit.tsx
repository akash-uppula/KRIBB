import { useUser } from "@clerk/expo";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSupabase } from "../../../../hooks/useSupabase";

const propertyTypes = ["apartment", "house", "villa", "studio"];

const EditProperty = () => {
  const { user } = useUser();
  const { id } = useLocalSearchParams<{ id: string }>();

  const supabase = useSupabase();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState("apartment");
  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");
  const [areaSqft, setAreaSqft] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isSold, setIsSold] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
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

        Alert.alert("Error", "Could not load this property.", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);

        setIsLoading(false);
        return;
      }

      // Security check on the client side.
      // The database RLS is still the real protection.
      if (data.clerk_user_id !== user?.id) {
        Alert.alert("Access Denied", "You can only edit your own properties.", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);

        setIsLoading(false);
        return;
      }

      // Fill form with existing property data
      setTitle(data.title);
      setDescription(data.description ?? "");
      setPrice(String(data.price));
      setType(data.type);
      setBedrooms(String(data.bedrooms));
      setBathrooms(String(data.bathrooms));
      setAreaSqft(data.area_sqft !== null ? String(data.area_sqft) : "");
      setAddress(data.address);
      setCity(data.city);
      setLatitude(data.latitude !== null ? String(data.latitude) : "");
      setLongitude(data.longitude !== null ? String(data.longitude) : "");
      setIsSold(data.is_sold);

      setIsLoading(false);
    };

    if (user) {
      fetchProperty();
    }
  }, [id, user, supabase]);

  const handleUpdateProperty = async () => {
    if (!user) {
      Alert.alert("Error", "You must be signed in.");
      return;
    }

    if (!id) {
      Alert.alert("Error", "Property ID is missing.");
      return;
    }

    if (!title.trim() || !price || !address.trim() || !city.trim()) {
      Alert.alert(
        "Missing Information",
        "Please fill in the title, price, address, and city.",
      );
      return;
    }

    if (Number.isNaN(Number(price))) {
      Alert.alert("Invalid Price", "Please enter a valid price.");
      return;
    }

    if (Number(price) < 0) {
      Alert.alert("Invalid Price", "Price cannot be negative.");
      return;
    }

    if (Number.isNaN(Number(bedrooms)) || Number(bedrooms) < 1) {
      Alert.alert(
        "Invalid Bedrooms",
        "Please enter a valid number of bedrooms.",
      );
      return;
    }

    if (Number.isNaN(Number(bathrooms)) || Number(bathrooms) < 1) {
      Alert.alert(
        "Invalid Bathrooms",
        "Please enter a valid number of bathrooms.",
      );
      return;
    }

    if (areaSqft && Number.isNaN(Number(areaSqft))) {
      Alert.alert("Invalid Area", "Please enter a valid area.");
      return;
    }

    if (latitude && Number.isNaN(Number(latitude))) {
      Alert.alert("Invalid Latitude", "Please enter a valid latitude.");
      return;
    }

    if (longitude && Number.isNaN(Number(longitude))) {
      Alert.alert("Invalid Longitude", "Please enter a valid longitude.");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("properties")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price: Number(price),
          type,
          bedrooms: Number(bedrooms),
          bathrooms: Number(bathrooms),
          area_sqft: areaSqft ? Number(areaSqft) : null,
          address: address.trim(),
          city: city.trim(),
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          is_sold: isSold,
        })
        .eq("id", id)
        .eq("clerk_user_id", user.id);

      if (error) {
        console.log("Update property error:", error.message);

        Alert.alert(
          "Update Failed",
          "Could not update the property. Please try again.",
        );

        return;
      }

      Alert.alert("Success", "Property updated successfully.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.log("Unexpected update error:", error);

      Alert.alert("Error", "Something went wrong while updating the property.");
    } finally {
      setIsSaving(false);
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

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 40,
      }}
    >
      {/* Header */}

      <Text className="text-2xl font-bold text-slate-900">Edit Property</Text>

      <Text className="mt-1 text-sm text-slate-500">
        Update your property details.
      </Text>

      {/* Title */}

      <View className="mt-7">
        <Text className="mb-2 text-sm font-semibold text-slate-700">Title</Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Beautiful 2BHK Apartment"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      {/* Description */}

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Description
        </Text>

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the property..."
          multiline
          textAlignVertical="top"
          className="min-h-28 rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900"
        />
      </View>

      {/* Price */}

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">Price</Text>

        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="e.g. 5000000"
          keyboardType="numeric"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      {/* Property Type */}

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Property Type
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {propertyTypes.map((item) => (
            <Pressable
              key={item}
              onPress={() => setType(item)}
              className={`rounded-xl border px-4 py-3 ${
                type === item
                  ? "border-blue-600 bg-blue-600"
                  : "border-slate-300 bg-white"
              }`}
            >
              <Text
                className={`font-medium capitalize ${
                  type === item ? "text-white" : "text-slate-700"
                }`}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Bedrooms */}

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Bedrooms
        </Text>

        <TextInput
          value={bedrooms}
          onChangeText={setBedrooms}
          keyboardType="numeric"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      {/* Bathrooms */}

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Bathrooms
        </Text>

        <TextInput
          value={bathrooms}
          onChangeText={setBathrooms}
          keyboardType="numeric"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      {/* Area */}

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Area (sqft)
        </Text>

        <TextInput
          value={areaSqft}
          onChangeText={setAreaSqft}
          placeholder="e.g. 1200"
          keyboardType="numeric"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      {/* Address */}

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Address
        </Text>

        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Full property address"
          multiline
          textAlignVertical="top"
          className="min-h-20 rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900"
        />
      </View>

      {/* City */}

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">City</Text>

        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Hyderabad"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      {/* Latitude */}

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Latitude
        </Text>

        <TextInput
          value={latitude}
          onChangeText={setLatitude}
          placeholder="e.g. 17.3850"
          keyboardType="decimal-pad"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      {/* Longitude */}

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Longitude
        </Text>

        <TextInput
          value={longitude}
          onChangeText={setLongitude}
          placeholder="e.g. 78.4867"
          keyboardType="decimal-pad"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      {/* Sold */}

      <View className="mt-5 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <View className="flex-1 pr-4">
          <Text className="text-sm font-semibold text-slate-700">
            Property Sold
          </Text>

          <Text className="mt-1 text-xs text-slate-500">
            Mark this property as sold.
          </Text>
        </View>

        <Switch value={isSold} onValueChange={setIsSold} />
      </View>

      {/* Featured */}

      <View className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <Text className="text-sm font-semibold text-slate-700">
          Featured Property
        </Text>

        <Text className="mt-1 text-xs text-slate-500">
          Featured status can only be changed by an administrator.
        </Text>
      </View>

      {/* Update */}

      <Pressable
        className={`mt-8 h-14 items-center justify-center rounded-xl ${
          isSaving ? "bg-blue-300" : "bg-blue-600 active:bg-blue-700"
        }`}
        onPress={handleUpdateProperty}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-base font-semibold text-white">
            Save Changes
          </Text>
        )}
      </Pressable>

      {/* Cancel */}

      <Pressable
        className="mt-3 h-14 items-center justify-center rounded-xl border border-slate-300 bg-white"
        onPress={() => router.back()}
        disabled={isSaving}
      >
        <Text className="text-base font-semibold text-slate-700">Cancel</Text>
      </Pressable>
    </ScrollView>
  );
};

export default EditProperty;
