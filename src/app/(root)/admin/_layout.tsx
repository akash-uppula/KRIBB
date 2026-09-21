import { Stack } from "expo-router";

const AdminLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Admin Panel",
        }}
      />

      <Stack.Screen
        name="properties"
        options={{
          title: "Manage Properties",
        }}
      />
    </Stack>
  );
};

export default AdminLayout;
