import { useUser } from "@clerk/expo";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

const propertyTypes = ["all", "apartment", "house", "villa", "studio"];

const Properties = () => {
  const { user } = useUser();
  const supabase = useSupabase();

  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Fetch properties error:", error.message);
      return;
    }

    setProperties(data ?? []);
  };

  // Fetch properties whenever this screen becomes active
  useFocusEffect(
    useCallback(() => {
      const loadProperties = async () => {
        await fetchProperties();
        setIsLoading(false);
      };

      loadProperties();
    }, [supabase]),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);

    await fetchProperties();

    setIsRefreshing(false);
  };

  const filteredProperties = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return properties.filter((property) => {
      // My Properties filter
      if (showOnlyMine && property.clerk_user_id !== user?.id) {
        return false;
      }

      // Property type filter
      const matchesType =
        selectedType === "all" || property.type.toLowerCase() === selectedType;

      if (!matchesType) {
        return false;
      }

      // Search filter
      if (!search) {
        return true;
      }

      const searchableText = [
        property.title,
        property.description ?? "",
        property.address,
        property.city,
        property.type,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [properties, searchText, selectedType, showOnlyMine, user?.id]);

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
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
        padding: 20,
        paddingBottom: 40,
      }}
    >
      {/* Header */}

      <Text className="text-2xl font-bold text-slate-900">Properties</Text>

      <Text className="mt-1 text-sm text-slate-500">
        Find your perfect property.
      </Text>

      {/* Search */}

      <View className="mt-6">
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search properties..."
          placeholderTextColor="#94A3B8"
          className="h-14 rounded-xl border border-slate-300 bg-slate-50 px-4 text-base text-slate-900"
        />
      </View>

      {/* Ownership Filter */}

      <View className="mt-4 flex-row">
        <Pressable
          onPress={() => setShowOnlyMine(false)}
          className={`mr-2 rounded-full border px-4 py-2.5 ${
            !showOnlyMine
              ? "border-blue-600 bg-blue-600"
              : "border-slate-300 bg-white"
          }`}
        >
          <Text
            className={`font-medium ${
              !showOnlyMine ? "text-white" : "text-slate-700"
            }`}
          >
            All Properties
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setShowOnlyMine(true)}
          className={`rounded-full border px-4 py-2.5 ${
            showOnlyMine
              ? "border-blue-600 bg-blue-600"
              : "border-slate-300 bg-white"
          }`}
        >
          <Text
            className={`font-medium ${
              showOnlyMine ? "text-white" : "text-slate-700"
            }`}
          >
            My Properties
          </Text>
        </Pressable>
      </View>

      {/* Property Type Filters */}

      <View className="mt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 8,
          }}
        >
          {propertyTypes.map((item) => (
            <Pressable
              key={item}
              onPress={() => setSelectedType(item)}
              className={`rounded-full border px-4 py-2.5 ${
                selectedType === item
                  ? "border-blue-600 bg-blue-600"
                  : "border-slate-300 bg-white"
              }`}
            >
              <Text
                className={`font-medium capitalize ${
                  selectedType === item ? "text-white" : "text-slate-700"
                }`}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Result Count */}

      <Text className="mt-6 text-sm font-medium text-slate-500">
        {filteredProperties.length}{" "}
        {filteredProperties.length === 1 ? "property" : "properties"} found
      </Text>

      {/* Empty State */}

      {filteredProperties.length === 0 ? (
        <View className="mt-5 items-center rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <Text className="text-lg font-semibold text-slate-900">
            No properties found
          </Text>

          <Text className="mt-2 text-center text-sm text-slate-500">
            {showOnlyMine
              ? "You haven't added any properties matching these filters."
              : "Try changing your search or property type."}
          </Text>

          {(searchText || selectedType !== "all" || showOnlyMine) && (
            <Pressable
              className="mt-5 rounded-xl bg-blue-600 px-5 py-3"
              onPress={() => {
                setSearchText("");
                setSelectedType("all");
                setShowOnlyMine(false);
              }}
            >
              <Text className="font-semibold text-white">Clear Filters</Text>
            </Pressable>
          )}
        </View>
      ) : (
        /* Property List */

        <View className="mt-5">
          {filteredProperties.map((property) => {
            const isMyProperty = property.clerk_user_id === user?.id;

            return (
              <Pressable
                key={property.id}
                className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white"
                onPress={() =>
                  router.push({
                    pathname: "/property/[id]",
                    params: {
                      id: property.id,
                    },
                  })
                }
              >
                {/* Image Placeholder */}

                <View className="h-48 items-center justify-center bg-slate-100">
                  <Text className="text-sm font-medium text-slate-400">
                    Property Image
                  </Text>
                </View>

                {/* Property Information */}

                <View className="p-5">
                  {/* Ownership / Featured / Sold */}

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
                        <Text className="text-xs font-semibold text-red-700">
                          Sold
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Title */}

                  <Text className="mt-3 text-lg font-bold text-slate-900">
                    {property.title}
                  </Text>

                  {/* Price */}

                  <Text className="mt-2 text-xl font-bold text-blue-600">
                    {formatPrice(property.price)}
                  </Text>

                  {/* Location */}

                  <Text className="mt-2 text-sm text-slate-500">
                    {property.address}, {property.city}
                  </Text>

                  {/* Property Stats */}

                  <View className="mt-4 flex-row items-center">
                    <Text className="text-sm font-medium text-slate-700">
                      {property.bedrooms}{" "}
                      {property.bedrooms === 1 ? "Bedroom" : "Bedrooms"}
                    </Text>

                    <Text className="mx-2 text-slate-300">•</Text>

                    <Text className="text-sm font-medium text-slate-700">
                      {property.bathrooms}{" "}
                      {property.bathrooms === 1 ? "Bathroom" : "Bathrooms"}
                    </Text>

                    {property.area_sqft && (
                      <>
                        <Text className="mx-2 text-slate-300">•</Text>

                        <Text className="text-sm font-medium text-slate-700">
                          {property.area_sqft} sqft
                        </Text>
                      </>
                    )}
                  </View>

                  {/* Type */}

                  <View className="mt-4">
                    <Text className="text-xs font-medium uppercase text-slate-400">
                      Type
                    </Text>

                    <Text className="mt-1 text-sm font-semibold capitalize text-slate-700">
                      {property.type}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

export default Properties;
