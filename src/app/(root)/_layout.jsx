import { useAuth } from "@clerk/expo";
import { Redirect, Slot } from "expo-router";

const RootLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Slot />;
};

export default RootLayout;