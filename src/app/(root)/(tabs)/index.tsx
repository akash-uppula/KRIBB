import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
  description: string | null;
  price: number;
  type: string;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number | null;
  address: string;
  city: string;
  images: string[];
  is_featured: boolean;
  is_sold: boolean;
  created_at: string;
};

const Home = () => {
  const { user } = useUser();
  const supabase = useSupabase();

  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProperties = async () => {
    try {
      // Featured properties
      const { data: featuredData, error: featuredError } = await supabase
        .from("properties")
        .select("*")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (featuredError) {
        console.log("Fetch featured properties error:", featuredError.message);
      } else {
        setFeaturedProperties((featuredData ?? []) as Property[]);
      }

      // Recent properties
      const { data: recentData, error: recentError } = await supabase
        .from("properties")
        .select("*")
        .eq("is_sold", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) {
        console.log("Fetch recent properties error:", recentError.message);
      } else {
        setRecentProperties((recentData ?? []) as Property[]);
      }
    } catch (error) {
      console.log("Unexpected home properties error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, [supabase]),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);

    await fetchProperties();

    setIsRefreshing(false);
  };

  const formatPrice = (price: number) => {
    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  const openProperty = (propertyId: string) => {
    router.push({
      pathname: "/property/[id]",
      params: {
        id: propertyId,
      },
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />

        <Text className="mt-3 text-sm text-slate-500">
          Loading properties...
        </Text>
      </View>
    );
  }

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

      <View className="px-5 pb-4 pt-6">
        <Text className="text-sm font-medium text-slate-500">Welcome back</Text>

        <Text className="mt-1 text-3xl font-bold text-slate-900">
          {user?.firstName || "Welcome"} 👋
        </Text>

        <Text className="mt-2 text-base text-slate-500">
          Find your next property.
        </Text>
      </View>

      {/* Featured */}

      <View className="mt-7">
        <View className="mb-3 flex-row items-center justify-between px-5">
          <Text className="text-xl font-bold text-slate-900">
            Featured Properties
          </Text>

          {featuredProperties.length > 0 && (
            <Pressable onPress={() => router.push("/properties")}>
              <Text className="text-sm font-semibold text-blue-600">
                See All
              </Text>
            </Pressable>
          )}
        </View>

        {featuredProperties.length === 0 ? (
          <View className="mx-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <Text className="text-center text-sm text-slate-500">
              No featured properties available yet.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
            }}
          >
            {featuredProperties.map((property) => (
              <Pressable
                key={property.id}
                className="mr-4 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white active:bg-slate-50"
                onPress={() => openProperty(property.id)}
              >
                {property.images && property.images.length > 0 ? (
                  <Image
                    source={{ uri: property.images[0] }}
                    className="h-44 w-full bg-slate-100"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-44 items-center justify-center bg-slate-100">
                    <Ionicons name="image-outline" size={40} color="#94A3B8" />
                  </View>
                )}

                <View className="p-4">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="mr-2 flex-1 text-lg font-bold text-slate-900"
                      numberOfLines={1}
                    >
                      {property.title}
                    </Text>

                    <View className="rounded-full bg-yellow-100 px-2.5 py-1">
                      <Text className="text-xs font-semibold text-yellow-700">
                        Featured
                      </Text>
                    </View>
                  </View>

                  <Text
                    className="mt-1 text-sm text-slate-500"
                    numberOfLines={1}
                  >
                    {property.address}, {property.city}
                  </Text>

                  <Text className="mt-3 text-xl font-bold text-blue-600">
                    {formatPrice(property.price)}
                  </Text>

                  <View className="mt-2 flex-row items-center">
                    <Text className="text-sm text-slate-600">
                      {property.bedrooms} Beds
                    </Text>

                    <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />

                    <Text className="text-sm text-slate-600">
                      {property.bathrooms} Baths
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Recent Properties */}

      <View className="mt-8 px-5">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-slate-900">
            Recent Properties
          </Text>

          {recentProperties.length > 0 && (
            <Pressable onPress={() => router.push("/properties")}>
              <Text className="text-sm font-semibold text-blue-600">
                See All
              </Text>
            </Pressable>
          )}
        </View>

        {recentProperties.length === 0 ? (
          <View className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <Text className="text-center text-sm text-slate-500">
              No properties available yet.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {recentProperties.map((property) => (
              <Pressable
                key={property.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white active:bg-slate-50"
                onPress={() => openProperty(property.id)}
              >
                {property.images && property.images.length > 0 ? (
                  <Image
                    source={{ uri: property.images[0] }}
                    className="h-48 w-full bg-slate-100"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-48 items-center justify-center bg-slate-100">
                    <Ionicons name="image-outline" size={40} color="#94A3B8" />
                  </View>
                )}

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

                    {property.is_featured && (
                      <View className="rounded-full bg-yellow-100 px-2.5 py-1">
                        <Text className="text-xs font-semibold text-yellow-700">
                          Featured
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text className="mt-3 text-xl font-bold text-blue-600">
                    {formatPrice(property.price)}
                  </Text>

                  <View className="mt-2 flex-row items-center">
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

                  <Text className="mt-2 text-sm capitalize text-slate-400">
                    {property.type}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default Home;
