import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

const SignIn = () => {
  const { signIn } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async () => {
    const { error: createError } = await signIn.create({
      identifier: email,
    });

    if (createError) {
      Alert.alert("Sign In Failed", createError.message);
      return;
    }

    const { error: passwordError } = await signIn.password({
      password,
    });

    if (passwordError) {
      Alert.alert("Sign In Failed", passwordError.message);
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: () => router.replace("/(root)/(tabs)"),
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Kribb</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="Sign In" onPress={handleSignIn} />

      <Link href="/(auth)/sign-up" style={styles.link}>
        Don't have an account? Sign Up
      </Link>
    </View>
  );
};

export default SignIn;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },

  link: {
    marginTop: 20,
    textAlign: "center",
  },
});
