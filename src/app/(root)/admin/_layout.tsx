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

      <Stack.Screen
        name="property-edit"
        options={{
          title: "Edit Property",
        }}
      />

      <Stack.Screen
        name="users"
        options={{
          title: "Manage Users",
        }}
      />
    </Stack>
  );
};

export default AdminLayout;
