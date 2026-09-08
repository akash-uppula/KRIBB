import { useSignUp } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

const SignUp = () => {
  const { signUp } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSignUp = async () => {
    const { error } = await signUp.password({
      emailAddress: email,
      password,
    });

    if (error) {
      Alert.alert("Sign Up Failed", error.message);
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();

    if (sendError) {
      Alert.alert("Verification Failed", sendError.message);
      return;
    }

    setIsVerifying(true);
  };

  const handleVerify = async () => {
    const { error } = await signUp.verifications.verifyEmailCode({
      code,
    });

    if (error) {
      Alert.alert("Verification Failed", error.message);
      return;
    }

    const { error: finalizeError } = await signUp.finalize({
      navigate: () => router.replace("/(root)/(tabs)"),
    });

    if (finalizeError) {
      Alert.alert("Sign Up Failed", finalizeError.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your Kribb account</Text>

      {!isVerifying ? (
        <>
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

          <Button title="Create Account" onPress={handleSignUp} />

          <Link href="/(auth)/sign-in" style={styles.link}>
            Already have an account? Sign In
          </Link>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>
            Enter the verification code sent to your email.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />

          <Button title="Verify Email" onPress={handleVerify} />
        </>
      )}
    </View>
  );
};

export default SignUp;

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

  subtitle: {
    fontSize: 16,
    marginBottom: 16,
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
