import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Camera, useCameraDevice } from "react-native-vision-camera";

export default function VisionCameraScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const device = useCameraDevice("front");
  const cameraRef = useRef<Camera | null>(null);

  // Request camera permission
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      const statusString = String(status);
      setHasPermission(statusString === "authorized");
    })();
  }, []);

  if (hasPermission === null || !device) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Loading camera…</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission denied.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
      />

      {/* Guide box */}
      <View style={styles.guideContainer} pointerEvents="none">
        <View style={styles.guideBox} />
      </View>

      {/* Simple bottom text */}
      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>
          Move until your head and shoulders fit inside the box.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },

  guideContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  guideBox: {
    width: "80%",
    height: "75%",
    borderColor: "#4CAF50",
    borderWidth: 2,
    borderRadius: 16,
    backgroundColor: "transparent",
    marginTop: -40,
  },

  bottomBar: {
    position: "absolute",
    bottom: 50,
    left: 8,
    right: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
  },
  bottomText: {
    color: "#ddd",
    fontSize: 13,
    textAlign: "center",
  },

  center: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  text: { color: "#fff", textAlign: "center", marginTop: 12 },

  button: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
  },
  buttonText: { color: "#fff" },
});
