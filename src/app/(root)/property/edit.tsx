import { useUser } from "@clerk/expo";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { useEffect, useState } from "react";
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

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>(
    [],
  );
  const [removedImages, setRemovedImages] = useState<string[]>([]);

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
        Alert.alert("Error", "Could not load this property.", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);

        setIsLoading(false);
        return;
      }

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
      setExistingImages(data.images ?? []);

      setIsLoading(false);
    };

    if (user) {
      fetchProperty();
    }
  }, [id, user, supabase]);

  const pickImages = async () => {
    const totalImages = existingImages.length + newImages.length;

    if (totalImages >= 5) {
      Alert.alert("Maximum Images", "You can have a maximum of 5 images.");
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

    const remainingSlots = 5 - totalImages;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    setNewImages((currentImages) => [
      ...currentImages,
      ...result.assets.slice(0, remainingSlots),
    ]);
  };

  const removeExistingImage = (imageUrl: string) => {
    setExistingImages((currentImages) =>
      currentImages.filter((image) => image !== imageUrl),
    );

    setRemovedImages((currentImages) => [...currentImages, imageUrl]);
  };

  const removeNewImage = (uri: string) => {
    setNewImages((currentImages) =>
      currentImages.filter((image) => image.uri !== uri),
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

  const uploadNewImages = async () => {
    if (!user?.id || !id || newImages.length === 0) {
      return [];
    }

    const uploadedUrls: string[] = [];

    for (let index = 0; index < newImages.length; index++) {
      const image = newImages[index];

      const file = new File(image.uri);
      const arrayBuffer = await file.arrayBuffer();

      const mimeType = image.mimeType ?? "image/jpeg";
      const extension =
        mimeType === "image/png"
          ? "png"
          : mimeType === "image/webp"
            ? "webp"
            : "jpg";

      const filePath = `${user.id}/${id}/image-${Date.now()}-${index}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage
        .from("property-images")
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const deleteRemovedImages = async () => {
    if (removedImages.length === 0) {
      return;
    }

    const storagePaths = removedImages
      .map(getStoragePathFromUrl)
      .filter((path): path is string => path !== null);

    if (storagePaths.length === 0) {
      return;
    }

    const { error } = await supabase.storage
      .from("property-images")
      .remove(storagePaths);

    if (error) {
      console.log("Delete removed images error:", error.message);
    }
  };

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
      const uploadedUrls = await uploadNewImages();

      const finalImages = [...existingImages, ...uploadedUrls];

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
          images: finalImages,
          is_sold: isSold,
        })
        .eq("id", id)
        .eq("clerk_user_id", user.id);

      if (error) {
        Alert.alert(
          "Update Failed",
          "Could not update the property. Please try again.",
        );
        return;
      }

      await deleteRemovedImages();

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

  const totalImages = existingImages.length + newImages.length;

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 40,
      }}
    >
      <Text className="text-2xl font-bold text-slate-900">Edit Property</Text>

      <Text className="mt-1 text-sm text-slate-500">
        Update your property details.
      </Text>

      {/* Images */}

      <View className="mt-7">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-slate-700">
            Property Images
          </Text>

          <Text className="text-xs text-slate-500">{totalImages}/5</Text>
        </View>

        <View className="mt-3 flex-row flex-wrap gap-3">
          {existingImages.map((imageUrl) => (
            <View
              key={imageUrl}
              className="relative h-28 w-[30%] overflow-hidden rounded-xl bg-slate-100"
            >
              <Image
                source={{ uri: imageUrl }}
                className="h-full w-full"
                resizeMode="cover"
              />

              <Pressable
                className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-black/60"
                onPress={() => removeExistingImage(imageUrl)}
                disabled={isSaving}
              >
                <Text className="text-base font-bold text-white">×</Text>
              </Pressable>
            </View>
          ))}

          {newImages.map((image) => (
            <View
              key={image.uri}
              className="relative h-28 w-[30%] overflow-hidden rounded-xl bg-slate-100"
            >
              <Image
                source={{ uri: image.uri }}
                className="h-full w-full"
                resizeMode="cover"
              />

              <View className="absolute bottom-1 left-1 rounded-md bg-blue-600 px-1.5 py-0.5">
                <Text className="text-[10px] font-semibold text-white">
                  New
                </Text>
              </View>

              <Pressable
                className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-black/60"
                onPress={() => removeNewImage(image.uri)}
                disabled={isSaving}
              >
                <Text className="text-base font-bold text-white">×</Text>
              </Pressable>
            </View>
          ))}

          {totalImages < 5 && (
            <Pressable
              className="h-28 w-[30%] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 active:bg-slate-100"
              onPress={pickImages}
              disabled={isSaving}
            >
              <Text className="text-2xl text-slate-400">+</Text>

              <Text className="mt-1 text-xs font-medium text-slate-500">
                Add Image
              </Text>
            </Pressable>
          )}
        </View>

        <Text className="mt-2 text-xs text-slate-400">
          You can upload up to 5 images.
        </Text>
      </View>

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
