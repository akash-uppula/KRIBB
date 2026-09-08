import { StyleSheet, Text, View } from "react-native";

const Saved = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved</Text>
    </View>
  );
};

export default Saved;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
