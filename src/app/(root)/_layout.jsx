import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

const RootLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />

      <Stack.Screen
        name="property/[id]"
        options={{
          headerShown: true,
          title: "Property Details",
        }}
      />

      <Stack.Screen
        name="property/edit"
        options={{
          headerShown: true,
          title: "Edit Property",
        }}
      />
    </Stack>
  );
};

export default RootLayout;
