import { useSignUp } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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

type FormErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  code?: string;
};

const SignUp = () => {
  const { signUp } = useSignUp();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});

  const validateSignUp = (): boolean => {
    const newErrors: FormErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      newErrors.email = "Enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
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

  const handleSignUp = async () => {
    Keyboard.dismiss();

    if (!validateSignUp()) {
      return;
    }

    setIsSigningUp(true);

    try {
      const { error } = await signUp.password({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim(),
        password,
      });

      if (error) {
        setErrors({
          email: error.message,
        });

        return;
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode();

      if (sendError) {
        setErrors({
          email: sendError.message,
        });

        return;
      }

      setErrors({});
      setIsVerifying(true);
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleVerify = async () => {
    Keyboard.dismiss();

    if (!validateCode()) {
      return;
    }

    setIsVerifyingCode(true);

    try {
      const { error } = await signUp.verifications.verifyEmailCode({
        code: code.trim(),
      });

      if (error) {
        setErrors({
          code: error.message,
        });

        return;
      }

      if (signUp.status !== "complete") {
        setErrors({
          code: "Your account could not be completed yet.",
        });

        return;
      }

      const { error: finalizeError } = await signUp.finalize({
        navigate: () => router.replace("/(root)/(tabs)"),
      });

      if (finalizeError) {
        setErrors({
          code: finalizeError.message,
        });
      }
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    Keyboard.dismiss();

    setIsResendingCode(true);
    setErrors({});

    try {
      const { error } = await signUp.verifications.sendEmailCode();

      if (error) {
        setErrors({
          code: error.message,
        });

        return;
      }

      setCode("");
    } finally {
      setIsResendingCode(false);
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
              source={require("../../../assets/images/kribb.png")}
              className="h-20 w-28"
              resizeMode="contain"
            />

            {!isVerifying ? (
              <>
                <View className="mt-7">
                  <Text className="text-3xl font-bold text-slate-900">
                    Create account
                  </Text>

                  <Text className="mt-2 text-base text-slate-500">
                    Find your dream home today
                  </Text>
                </View>

                {/* First + Last Name */}
                <View className="mt-8 flex-row gap-3">
                  <View className="flex-1">
                    <TextInput
                      className={`h-14 rounded-xl border bg-white px-4 text-base text-slate-900 ${
                        errors.firstName ? "border-red-500" : "border-slate-200"
                      }`}
                      placeholder="First name"
                      placeholderTextColor="#9CA3AF"
                      value={firstName}
                      onChangeText={(value) => {
                        setFirstName(value);

                        if (errors.firstName) {
                          setErrors((current) => ({
                            ...current,
                            firstName: undefined,
                          }));
                        }
                      }}
                      autoCapitalize="words"
                      autoCorrect={false}
                      autoComplete="given-name"
                      returnKeyType="next"
                    />

                    {errors.firstName && (
                      <Text className="mt-1.5 text-xs text-red-500">
                        {errors.firstName}
                      </Text>
                    )}
                  </View>

                  <View className="flex-1">
                    <TextInput
                      className={`h-14 rounded-xl border bg-white px-4 text-base text-slate-900 ${
                        errors.lastName ? "border-red-500" : "border-slate-200"
                      }`}
                      placeholder="Last name"
                      placeholderTextColor="#9CA3AF"
                      value={lastName}
                      onChangeText={(value) => {
                        setLastName(value);

                        if (errors.lastName) {
                          setErrors((current) => ({
                            ...current,
                            lastName: undefined,
                          }));
                        }
                      }}
                      autoCapitalize="words"
                      autoCorrect={false}
                      autoComplete="family-name"
                      returnKeyType="next"
                    />

                    {errors.lastName && (
                      <Text className="mt-1.5 text-xs text-red-500">
                        {errors.lastName}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Email */}
                <View className="mt-4">
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
                  <TextInput
                    className={`h-14 rounded-xl border bg-white px-4 text-base text-slate-900 ${
                      errors.password ? "border-red-500" : "border-slate-200"
                    }`}
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
                    autoComplete="new-password"
                    secureTextEntry
                    returnKeyType="done"
                  />

                  {errors.password && (
                    <Text className="mt-1.5 text-xs text-red-500">
                      {errors.password}
                    </Text>
                  )}
                </View>

                {/* Sign Up */}
                <Pressable
                  className={`mt-7 h-14 items-center justify-center rounded-xl ${
                    isSigningUp
                      ? "bg-blue-300"
                      : "bg-blue-600 active:bg-blue-700"
                  }`}
                  onPress={handleSignUp}
                  disabled={isSigningUp}
                >
                  {isSigningUp ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-semibold text-white">
                      Sign Up
                    </Text>
                  )}
                </Pressable>

                {/* Sign In */}
                <View className="mt-5 flex-row justify-center">
                  <Text className="text-sm text-slate-500">
                    Already have an account?{" "}
                  </Text>

                  <Link href="/(auth)/sign-in">
                    <Text className="text-sm font-semibold text-blue-600">
                      Sign In
                    </Text>
                  </Link>
                </View>
              </>
            ) : (
              <>
                <View className="mt-8">
                  <Text className="text-3xl font-bold text-slate-900">
                    Verify your account
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
                  onPress={handleVerify}
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
              </>
            )}
          </View>
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );
};

export default SignUp;
