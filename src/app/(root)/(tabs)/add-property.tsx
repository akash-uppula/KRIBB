import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { router } from "expo-router";
import { File } from "expo-file-system";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSupabase } from "../../../../hooks/useSupabase";

const AddProperty = () => {
  const { user } = useUser();
  const supabase = useSupabase();

  // --------------------------------
  // Form state
  // --------------------------------

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

  // --------------------------------
  // Image state
  // --------------------------------

  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  // --------------------------------
  // Loading state
  // --------------------------------

  const [isSaving, setIsSaving] = useState(false);

  // --------------------------------
  // Pick images
  // --------------------------------

  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert("Image Limit", "You can select a maximum of 5 images.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow photo library access to select property images.",
      );
      return;
    }

    const remainingSlots = 5 - images.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    setImages((currentImages) => [
      ...currentImages,
      ...result.assets.slice(0, remainingSlots),
    ]);
  };

  // --------------------------------
  // Remove image
  // --------------------------------

  const removeImage = (index: number) => {
    setImages((currentImages) =>
      currentImages.filter((_, imageIndex) => imageIndex !== index),
    );
  };

  // --------------------------------
  // Reset form
  // --------------------------------

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setType("apartment");
    setBedrooms("1");
    setBathrooms("1");
    setAreaSqft("");
    setAddress("");
    setCity("");
    setLatitude("");
    setLongitude("");
    setIsSold(false);
    setImages([]);
  };

  // --------------------------------
  // Upload images
  // --------------------------------

  const uploadImages = async (propertyId: string): Promise<string[]> => {
    if (!user || images.length === 0) {
      return [];
    }

    const uploadedUrls: string[] = [];

    for (let index = 0; index < images.length; index++) {
      const image = images[index];

      console.log("Uploading image:", image.uri);

      // --------------------------------
      // Read image from phone
      // --------------------------------

      const file = new File(image.uri);

      const arrayBuffer = await file.arrayBuffer();

      console.log("Image read successfully:", arrayBuffer.byteLength, "bytes");

      // --------------------------------
      // Get image type
      // --------------------------------

      const mimeType = image.mimeType ?? "image/jpeg";

      let extension = "jpg";

      if (mimeType === "image/png") {
        extension = "png";
      } else if (mimeType === "image/webp") {
        extension = "webp";
      } else if (mimeType === "image/heic") {
        extension = "heic";
      } else if (mimeType === "image/heif") {
        extension = "heif";
      } else if (mimeType === "image/jpeg") {
        extension = "jpg";
      }

      // --------------------------------
      // Storage path
      // --------------------------------

      const filePath = `${user.id}/${propertyId}/image-${index + 1}.${extension}`;

      console.log("Uploading to Supabase:", filePath);

      // --------------------------------
      // Upload to Supabase Storage
      // --------------------------------

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.log("Supabase image upload error:", uploadError);

        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      // --------------------------------
      // Get public URL
      // --------------------------------

      const { data: publicUrlData } = supabase.storage
        .from("property-images")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      console.log("Image uploaded successfully:", publicUrl);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  // --------------------------------
  // Add property
  // --------------------------------

  const handleAddProperty = async () => {
    if (!user) {
      Alert.alert("Error", "You must be signed in.");
      return;
    }

    // --------------------------------
    // Required fields
    // --------------------------------

    if (!title.trim() || !price.trim() || !address.trim() || !city.trim()) {
      Alert.alert(
        "Missing Information",
        "Please fill in the title, price, address, and city.",
      );
      return;
    }

    // --------------------------------
    // Price validation
    // --------------------------------

    if (Number.isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid price.");
      return;
    }

    // --------------------------------
    // Bedroom validation
    // --------------------------------

    if (Number.isNaN(Number(bedrooms)) || Number(bedrooms) < 1) {
      Alert.alert(
        "Invalid Bedrooms",
        "Please enter a valid number of bedrooms.",
      );
      return;
    }

    // --------------------------------
    // Bathroom validation
    // --------------------------------

    if (Number.isNaN(Number(bathrooms)) || Number(bathrooms) < 1) {
      Alert.alert(
        "Invalid Bathrooms",
        "Please enter a valid number of bathrooms.",
      );
      return;
    }

    // --------------------------------
    // Area validation
    // --------------------------------

    if (areaSqft && (Number.isNaN(Number(areaSqft)) || Number(areaSqft) <= 0)) {
      Alert.alert("Invalid Area", "Please enter a valid area.");
      return;
    }

    // --------------------------------
    // Latitude validation
    // --------------------------------

    if (latitude && Number.isNaN(Number(latitude))) {
      Alert.alert("Invalid Latitude", "Please enter a valid latitude.");
      return;
    }

    // --------------------------------
    // Longitude validation
    // --------------------------------

    if (longitude && Number.isNaN(Number(longitude))) {
      Alert.alert("Invalid Longitude", "Please enter a valid longitude.");
      return;
    }

    setIsSaving(true);

    try {
      // --------------------------------
      // 1. Create property
      // --------------------------------

      const { data, error } = await supabase
        .from("properties")
        .insert({
          clerk_user_id: user.id,

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

          // Images are uploaded after
          // receiving the property ID.
          images: [],

          // User cannot control featured status.
          is_featured: false,

          is_sold: isSold,
        })
        .select()
        .single();

      if (error) {
        console.log("Add property error:", error.message);

        Alert.alert("Failed", "Could not add the property. Please try again.");

        return;
      }

      console.log("Property created:", data);

      // --------------------------------
      // 2. Upload images
      // --------------------------------

      if (images.length > 0) {
        const imageUrls = await uploadImages(data.id);

        console.log("All images uploaded:", imageUrls);

        // --------------------------------
        // 3. Save URLs to property
        // --------------------------------

        const { error: imageUpdateError } = await supabase
          .from("properties")
          .update({
            images: imageUrls,
          })
          .eq("id", data.id);

        if (imageUpdateError) {
          console.log(
            "Update property images error:",
            imageUpdateError.message,
          );

          Alert.alert(
            "Property Added",
            "The property was created, but the images could not be saved.",
          );

          resetForm();

          return;
        }
      }

      // --------------------------------
      // 4. Success
      // --------------------------------

      resetForm();

      Alert.alert("Success", "Property added successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.log("Unexpected add property error:", error);

      const message = error instanceof Error ? error.message : String(error);

      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  };

  // --------------------------------
  // UI
  // --------------------------------

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

      <Text className="text-2xl font-bold text-slate-900">Add Property</Text>

      <Text className="mt-1 text-sm text-slate-500">
        Add a new property to KRIBB.
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
          {["apartment", "house", "villa", "studio"].map((item) => (
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

      {/* Images */}

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Property Images
        </Text>

        <Text className="mb-3 text-xs text-slate-500">
          Select up to 5 images of your property.
        </Text>

        {/* Selected images */}

        {images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3"
          >
            <View className="flex-row gap-3">
              {images.map((image, index) => (
                <View key={`${image.uri}-${index}`} className="relative">
                  <Image
                    source={{
                      uri: image.uri,
                    }}
                    className="h-28 w-28 rounded-xl bg-slate-100"
                    resizeMode="cover"
                  />

                  {/* Remove image */}

                  <Pressable
                    onPress={() => removeImage(index)}
                    className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-black/70"
                  >
                    <Text className="text-base font-bold text-white">×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Add images */}

        {images.length < 5 && (
          <Pressable
            onPress={pickImages}
            disabled={isSaving}
            className="h-14 flex-row items-center justify-center rounded-xl border border-dashed border-blue-400 bg-blue-50 active:bg-blue-100"
          >
            <Ionicons name="images-outline" size={22} color="#2563EB" />

            <Text className="ml-2 font-semibold text-blue-600">Add Images</Text>
          </Pressable>
        )}

        {/* Image count */}

        {images.length > 0 && (
          <Text className="mt-2 text-xs text-slate-400">
            {images.length}/5 images selected
          </Text>
        )}
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

      {/* Add Property */}

      <Pressable
        className={`mt-8 h-14 items-center justify-center rounded-xl ${
          isSaving ? "bg-blue-300" : "bg-blue-600 active:bg-blue-700"
        }`}
        onPress={handleAddProperty}
        disabled={isSaving}
      >
        {isSaving ? (
          <View className="flex-row items-center">
            <ActivityIndicator color="#FFFFFF" />

            <Text className="ml-2 font-semibold text-white">
              Adding Property...
            </Text>
          </View>
        ) : (
          <Text className="text-center text-base font-semibold text-white">
            Add Property
          </Text>
        )}
      </Pressable>

      {/* Cancel */}

      <Pressable
        className="mt-3 h-14 items-center justify-center rounded-xl border border-slate-300 bg-white"
        onPress={() => {
          resetForm();
          router.back();
        }}
        disabled={isSaving}
      >
        <Text className="text-center text-base font-semibold text-slate-700">
          Cancel
        </Text>
      </Pressable>
    </ScrollView>
  );
};

export default AddProperty;
