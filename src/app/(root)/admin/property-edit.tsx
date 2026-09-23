import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { router, useLocalSearchParams } from "expo-router";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
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

type ExistingImage = {
  uri: string;
  isNew: boolean;
  asset?: ImagePicker.ImagePickerAsset;
};

const AdminPropertyEdit = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
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
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSold, setIsSold] = useState(false);
  const [images, setImages] = useState<ExistingImage[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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
      return false;
    }

    return data?.is_admin === true;
  }, [supabase, user?.id]);

  const loadProperty = useCallback(async () => {
    if (!id) {
      Alert.alert("Error", "Property ID is missing.");
      router.back();
      return;
    }

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      Alert.alert("Error", "Could not load the property.");
      router.back();
      return;
    }

    setTitle(data.title ?? "");
    setDescription(data.description ?? "");
    setPrice(
      data.price !== null && data.price !== undefined ? String(data.price) : "",
    );
    setType(data.type ?? "apartment");
    setBedrooms(String(data.bedrooms ?? 1));
    setBathrooms(String(data.bathrooms ?? 1));
    setAreaSqft(
      data.area_sqft !== null && data.area_sqft !== undefined
        ? String(data.area_sqft)
        : "",
    );
    setAddress(data.address ?? "");
    setCity(data.city ?? "");
    setLatitude(
      data.latitude !== null && data.latitude !== undefined
        ? String(data.latitude)
        : "",
    );
    setLongitude(
      data.longitude !== null && data.longitude !== undefined
        ? String(data.longitude)
        : "",
    );
    setIsFeatured(data.is_featured === true);
    setIsSold(data.is_sold === true);

    setImages(
      Array.isArray(data.images)
        ? data.images.map((uri: string) => ({
            uri,
            isNew: false,
          }))
        : [],
    );
  }, [id, supabase]);

  useEffect(() => {
    const load = async () => {
      const admin = await checkAdmin();

      setIsAdmin(admin);

      if (admin) {
        await loadProperty();
      }

      setIsLoading(false);
    };

    load();
  }, [checkAdmin, loadProperty]);

  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert("Image Limit", "You can have a maximum of 5 images.");
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

    const selected = result.assets.slice(0, remainingSlots).map((asset) => ({
      uri: asset.uri,
      isNew: true,
      asset,
    }));

    setImages((current) => [...current, ...selected]);
  };

  const removeImage = (index: number) => {
    setImages((current) =>
      current.filter((_, imageIndex) => imageIndex !== index),
    );
  };

  const uploadNewImages = async (propertyId: string): Promise<string[]> => {
    if (!user) {
      throw new Error("You must be signed in.");
    }

    const newImages = images.filter((image) => image.isNew && image.asset);

    const uploadedUrls: string[] = [];

    for (let index = 0; index < newImages.length; index++) {
      const image = newImages[index];
      const asset = image.asset!;

      const file = new File(asset.uri);
      const arrayBuffer = await file.arrayBuffer();

      const mimeType = asset.mimeType ?? "image/jpeg";

      let extension = "jpg";

      if (mimeType === "image/png") {
        extension = "png";
      } else if (mimeType === "image/webp") {
        extension = "webp";
      } else if (mimeType === "image/heic") {
        extension = "heic";
      } else if (mimeType === "image/heif") {
        extension = "heif";
      }

      const filePath = `${user.id}/${propertyId}/admin-image-${Date.now()}-${index + 1}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      const { data } = supabase.storage
        .from("property-images")
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const validate = () => {
    if (!title.trim() || !price.trim() || !address.trim() || !city.trim()) {
      Alert.alert(
        "Missing Information",
        "Please fill in the title, price, address, and city.",
      );
      return false;
    }

    if (Number.isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid price.");
      return false;
    }

    if (Number.isNaN(Number(bedrooms)) || Number(bedrooms) < 1) {
      Alert.alert(
        "Invalid Bedrooms",
        "Please enter a valid number of bedrooms.",
      );
      return false;
    }

    if (Number.isNaN(Number(bathrooms)) || Number(bathrooms) < 1) {
      Alert.alert(
        "Invalid Bathrooms",
        "Please enter a valid number of bathrooms.",
      );
      return false;
    }

    if (areaSqft && (Number.isNaN(Number(areaSqft)) || Number(areaSqft) <= 0)) {
      Alert.alert("Invalid Area", "Please enter a valid area.");
      return false;
    }

    if (latitude && Number.isNaN(Number(latitude))) {
      Alert.alert("Invalid Latitude", "Please enter a valid latitude.");
      return false;
    }

    if (longitude && Number.isNaN(Number(longitude))) {
      Alert.alert("Invalid Longitude", "Please enter a valid longitude.");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!id || !validate()) {
      return;
    }

    setIsSaving(true);

    try {
      const newImageUrls = await uploadNewImages(id);

      const existingImageUrls = images
        .filter((image) => !image.isNew)
        .map((image) => image.uri);

      const finalImages = [...existingImageUrls, ...newImageUrls];

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
          is_featured: isFeatured,
          is_sold: isSold,
        })
        .eq("id", id);

      if (error) {
        Alert.alert("Update Failed", error.message);
        return;
      }

      Alert.alert("Success", "Property updated successfully.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isAdmin === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />

        <Text className="mt-3 text-sm text-slate-500">Loading property...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-2xl font-bold text-slate-900">Access Denied</Text>

        <Text className="mt-2 text-center text-sm text-slate-500">
          Only administrators can edit properties.
        </Text>
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
      <Text className="text-2xl font-bold text-slate-900">Edit Property</Text>

      <Text className="mt-1 text-sm text-slate-500">
        Update all property information.
      </Text>

      <View className="mt-7">
        <Text className="mb-2 text-sm font-semibold text-slate-700">Title</Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Property title"
          placeholderTextColor="#94A3B8"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Description
        </Text>

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the property..."
          placeholderTextColor="#94A3B8"
          multiline
          textAlignVertical="top"
          className="min-h-28 rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900"
        />
      </View>

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">Price</Text>

        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="e.g. 5000000"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

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

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Bedrooms
        </Text>

        <TextInput
          value={bedrooms}
          onChangeText={setBedrooms}
          placeholder="At least 1"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Bathrooms
        </Text>

        <TextInput
          value={bathrooms}
          onChangeText={setBathrooms}
          placeholder="At least 1"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Area (sqft)
        </Text>

        <TextInput
          value={areaSqft}
          onChangeText={setAreaSqft}
          placeholder="e.g. 1200"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Address
        </Text>

        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Full property address"
          placeholderTextColor="#94A3B8"
          multiline
          textAlignVertical="top"
          className="min-h-20 rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900"
        />
      </View>

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">City</Text>

        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Hyderabad"
          placeholderTextColor="#94A3B8"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Latitude
        </Text>

        <TextInput
          value={latitude}
          onChangeText={setLatitude}
          placeholder="e.g. 17.3850"
          placeholderTextColor="#94A3B8"
          keyboardType="decimal-pad"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      <View className="mt-5">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Longitude
        </Text>

        <TextInput
          value={longitude}
          onChangeText={setLongitude}
          placeholder="e.g. 78.4867"
          placeholderTextColor="#94A3B8"
          keyboardType="decimal-pad"
          className="h-14 rounded-xl border border-slate-300 px-4 text-base text-slate-900"
        />
      </View>

      <View className="mt-6">
        <Text className="mb-2 text-sm font-semibold text-slate-700">
          Property Images
        </Text>

        <Text className="mb-3 text-xs text-slate-500">Maximum 5 images.</Text>

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
                    source={{ uri: image.uri }}
                    className="h-28 w-28 rounded-xl bg-slate-100"
                    resizeMode="cover"
                  />

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

        {images.length < 5 && (
          <Pressable
            onPress={pickImages}
            disabled={isSaving}
            className="h-14 flex-row items-center justify-center rounded-xl border border-dashed border-blue-400 bg-blue-50"
          >
            <Ionicons name="images-outline" size={22} color="#2563EB" />

            <Text className="ml-2 font-semibold text-blue-600">Add Images</Text>
          </Pressable>
        )}

        <Text className="mt-2 text-xs text-slate-400">
          {images.length}/5 images
        </Text>
      </View>

      <View className="mt-5 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <View className="flex-1 pr-4">
          <Text className="text-sm font-semibold text-slate-700">
            Featured Property
          </Text>

          <Text className="mt-1 text-xs text-slate-500">
            Only administrators can change this.
          </Text>
        </View>

        <Switch value={isFeatured} onValueChange={setIsFeatured} />
      </View>

      <View className="mt-4 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
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

      <Pressable
        onPress={handleSave}
        disabled={isSaving}
        className={`mt-8 h-14 items-center justify-center rounded-xl ${
          isSaving ? "bg-blue-300" : "bg-blue-600 active:bg-blue-700"
        }`}
      >
        {isSaving ? (
          <View className="flex-row items-center">
            <ActivityIndicator color="#FFFFFF" />

            <Text className="ml-2 font-semibold text-white">
              Saving Changes...
            </Text>
          </View>
        ) : (
          <Text className="text-base font-semibold text-white">
            Save Changes
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.back()}
        disabled={isSaving}
        className="mt-3 h-14 items-center justify-center rounded-xl border border-slate-300 bg-white"
      >
        <Text className="text-base font-semibold text-slate-700">Cancel</Text>
      </Pressable>
    </ScrollView>
  );
};

export default AdminPropertyEdit;
