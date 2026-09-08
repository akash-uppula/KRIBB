import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";

const Index = () => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/(root)/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
};

export default Index;
