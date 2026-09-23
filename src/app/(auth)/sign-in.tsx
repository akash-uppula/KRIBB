import { useSignIn } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
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

type FormErrors = {
  email?: string;
  password?: string;
  code?: string;
};

const SignIn = () => {
  const { signIn } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});

  const validateSignIn = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      newErrors.email = "Enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const validateCode = (): boolean => {
    if (!code.trim()) {
      setErrors({
        code: "Verification code is required",
      });

      return false;
    }

    setErrors({});
    return true;
  };

  const handleSignIn = async () => {
    Keyboard.dismiss();

    if (!validateSignIn()) {
      return;
    }

    setIsSigningIn(true);

    try {
      const { error: createError } = await signIn.create({
        identifier: email.trim(),
      });
      if (createError) {
        setErrors({
          email: createError.message,
        });

        return;
      }
      const { error: passwordError } = await signIn.password({
        password,
      });
      if (passwordError) {
        setErrors({
          password: passwordError.message,
        });

        return;
      }
      if (signIn.status === "complete") {
        await finalizeSignIn();
        return;
      }
      if (signIn.status === "needs_client_trust") {
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );

        if (!emailCodeFactor) {
          Alert.alert(
            "Verification Unavailable",
            "Clerk requires device verification, but email verification is not available for this account.",
          );

          return;
        }
        const { error: sendError } = await signIn.mfa.sendEmailCode();

        if (sendError) {
          setErrors({
            code: sendError.message,
          });

          return;
        }
        setCode("");
        setErrors({});
        setIsVerifying(true);

        return;
      }
      Alert.alert(
        "Sign In Incomplete",
        `Clerk requires another step.\n\nStatus: ${signIn.status}`,
      );
    } catch (error) {
      Alert.alert(
        "Sign In Error",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleVerifyDevice = async () => {
    Keyboard.dismiss();

    if (!validateCode()) {
      return;
    }

    setIsVerifyingCode(true);

    try {
      const { error } = await signIn.mfa.verifyEmailCode({
        code: code.trim(),
      });
      if (error) {
        setErrors({
          code: error.message,
        });

        return;
      }

      if (signIn.status === "complete") {
        await finalizeSignIn();
      } else {
        setErrors({
          code: `Verification completed, but sign-in is still incomplete. Status: ${signIn.status}`,
        });
      }
    } catch (error) {
      setErrors({
        code:
          error instanceof Error ? error.message : "Unable to verify the code.",
      });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    Keyboard.dismiss();

    setIsResendingCode(true);
    setErrors({});

    try {
      const { error } = await signIn.mfa.sendEmailCode();

      if (error) {
        setErrors({
          code: error.message,
        });

        return;
      }

      setCode("");

      Alert.alert(
        "Code Sent",
        "A new verification code has been sent to your email.",
      );
    } catch (error) {
      setErrors({
        code:
          error instanceof Error ? error.message : "Unable to send a new code.",
      });
    } finally {
      setIsResendingCode(false);
    }
  };

  const handleUseDifferentAccount = async () => {
    try {
      await signIn.reset();
    } catch {}

    setIsVerifying(false);
    setCode("");
    setErrors({});
    setEmail("");
    setPassword("");
    setShowPassword(false);
  };

  const finalizeSignIn = async () => {
    const { error: finalizeError } = await signIn.finalize({
      navigate: () => {
        router.replace("/(root)/(tabs)");
      },
    });

    if (finalizeError) {
      Alert.alert("Sign In Failed", finalizeError.message);
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
            <Image
              source={kribbLogo}
              className="h-20 w-28"
              resizeMode="contain"
            />

            {!isVerifying ? (
              <>
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
                    className={`h-14 rounded-xl border bg-white px-4 text-base text-slate-900 ${
                      errors.email ? "border-red-500" : "border-slate-200"
                    }`}
                    placeholder="Email address"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);

                      if (errors.email) {
                        setErrors((current) => ({
                          ...current,
                          email: undefined,
                        }));
                      }
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    keyboardAppearance="light"
                    returnKeyType="next"
                  />

                  {errors.email && (
                    <Text className="mt-1.5 text-xs text-red-500">
                      {errors.email}
                    </Text>
                  )}
                </View>

                {/* Password */}
                <View className="mt-4">
                  <View
                    className={`h-14 flex-row items-center rounded-xl border bg-white ${
                      errors.password ? "border-red-500" : "border-slate-200"
                    }`}
                  >
                    <TextInput
                      className="h-14 flex-1 px-4 text-base text-slate-900"
                      placeholder="Password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);

                        if (errors.password) {
                          setErrors((current) => ({
                            ...current,
                            password: undefined,
                          }));
                        }
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="current-password"
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                    />

                    <Pressable
                      className="h-14 w-14 items-center justify-center"
                      onPress={() => setShowPassword((current) => !current)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color="#64748B"
                      />
                    </Pressable>
                  </View>

                  {errors.password && (
                    <Text className="mt-1.5 text-xs text-red-500">
                      {errors.password}
                    </Text>
                  )}
                </View>

                {/* Sign In */}
                <Pressable
                  className={`mt-7 h-14 items-center justify-center rounded-xl ${
                    isSigningIn
                      ? "bg-blue-300"
                      : "bg-blue-600 active:bg-blue-700"
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
              </>
            ) : (
              <>
                {/* Device Trust Heading */}
                <View className="mt-8">
                  <Text className="text-3xl font-bold text-slate-900">
                    Verify your device
                  </Text>

                  <Text className="mt-2 text-base text-slate-500">
                    We sent a verification code to
                  </Text>

                  <Text className="mt-1 text-base font-medium text-slate-900">
                    {email}
                  </Text>
                </View>

                {/* Verification Code */}
                <View className="mt-8">
                  <TextInput
                    className={`h-14 rounded-xl border bg-white px-4 text-base text-slate-900 ${
                      errors.code ? "border-red-500" : "border-slate-200"
                    }`}
                    placeholder="Enter verification code"
                    placeholderTextColor="#9CA3AF"
                    value={code}
                    onChangeText={(value) => {
                      setCode(value);

                      if (errors.code) {
                        setErrors((current) => ({
                          ...current,
                          code: undefined,
                        }));
                      }
                    }}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    returnKeyType="done"
                  />

                  {errors.code && (
                    <Text className="mt-1.5 text-xs text-red-500">
                      {errors.code}
                    </Text>
                  )}
                </View>

                {/* Verify */}
                <Pressable
                  className={`mt-6 h-14 items-center justify-center rounded-xl ${
                    isVerifyingCode
                      ? "bg-blue-300"
                      : "bg-blue-600 active:bg-blue-700"
                  }`}
                  onPress={handleVerifyDevice}
                  disabled={isVerifyingCode}
                >
                  {isVerifyingCode ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-semibold text-white">
                      Verify
                    </Text>
                  )}
                </Pressable>

                {/* Resend */}
                <Pressable
                  className="mt-7 self-start"
                  onPress={handleResendCode}
                  disabled={isResendingCode}
                >
                  {isResendingCode ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color="#2563EB" />

                      <Text className="ml-2 text-sm font-medium text-blue-600">
                        Sending new code...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-sm font-medium text-blue-600">
                      I need a new code
                    </Text>
                  )}
                </Pressable>

                {/* Use Different Account */}
                <Pressable
                  className="mt-4 self-start"
                  onPress={handleUseDifferentAccount}
                >
                  <Text className="text-sm font-medium text-slate-600">
                    Use a different account
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );
};

export default SignIn;
