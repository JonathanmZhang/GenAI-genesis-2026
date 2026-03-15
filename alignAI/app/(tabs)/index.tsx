import React from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import PreSession from "../pre-session";

export default function Index() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <PreSession />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});
