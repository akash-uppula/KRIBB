import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import kribbLogo from "../../../assets/images/kribb.png";

const SignIn = () => {
  const { signIn } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    Keyboard.dismiss();

    setIsSigningIn(true);

    try {
      const { error: createError } = await signIn.create({
        identifier: email.trim(),
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
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Pressable className="flex-1" onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center px-5 py-10">
            {/* KRIBB Logo */}
            <Image
              source={kribbLogo}
              className="h-20 w-28"
              resizeMode="contain"
            />

            {/* Heading */}
            <View className="mt-7">
              <Text className="text-3xl font-bold text-slate-900">
                Welcome back
              </Text>

              <Text className="mt-2 text-base text-slate-500">
                Sign in to continue to Kribb
              </Text>
            </View>

            {/* Email */}
            <View className="mt-8">
              <TextInput
                className="h-14 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900"
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                keyboardAppearance="light"
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View className="mt-4">
              <TextInput
                className="h-14 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900"
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                secureTextEntry
                returnKeyType="done"
              />
            </View>

            {/* Sign In Button */}
            <Pressable
              className={`mt-7 h-14 items-center justify-center rounded-xl ${
                isSigningIn ? "bg-blue-300" : "bg-blue-600 active:bg-blue-700"
              }`}
              onPress={handleSignIn}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  Sign In
                </Text>
              )}
            </Pressable>

            {/* Sign Up */}
            <View className="mt-5 flex-row justify-center">
              <Text className="text-sm text-slate-500">
                Don't have an account?{" "}
              </Text>

              <Link href="/(auth)/sign-up">
                <Text className="text-sm font-semibold text-blue-600">
                  Sign Up
                </Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );
};

export default SignIn;
