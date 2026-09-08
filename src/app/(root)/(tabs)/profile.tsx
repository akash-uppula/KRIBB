import { useAuth, useUser } from "@clerk/expo";
import { router } from "expo-router";
import { Alert, Button, StyleSheet, Text, View } from "react-native";

const Profile = () => {
  const { signOut } = useAuth();
  const { user } = useUser();

  const handleSignOut = async () => {
    try {
      await signOut();

      router.replace("/(auth)/sign-in");
    } catch {
      Alert.alert("Sign Out Failed", "Something went wrong while signing out.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <Text style={styles.name}>{user?.firstName ?? "User"}</Text>

      <Text style={styles.email}>
        {user?.primaryEmailAddress?.emailAddress ?? ""}
      </Text>

      <Button title="Sign Out" onPress={handleSignOut} />
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
  },

  name: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },

  email: {
    fontSize: 16,
    marginBottom: 30,
  },
});
