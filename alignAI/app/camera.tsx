import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { STRETCHES, Stretch } from "../data/stretches";

const HOLD_DURATION_SECONDS = 10;

type CameraScreenProps = {
  neck?: number;
  shoulders?: number;
  lowerBack?: number;
};

export default function CameraScreen({
  neck = 0,
  shoulders = 0,
  lowerBack = 0,
}: CameraScreenProps) {
  const router = useRouter();

  // Android hardware back button: confirm before exiting
  useEffect(() => {
    const onBack = () => {
      Alert.alert(
        "End session?",
        "Do you want to stop this stretch and go back?",
        [
          { text: "No", style: "cancel", onPress: () => {} },
          {
            text: "Yes",
            style: "destructive",
            onPress: () => {
              router.replace("/");
            },
          },
        ],
      );
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [router]);

  // Read params for current stretch
  const { stretchId, stretchIds, index } = useLocalSearchParams<{
    stretchId?: string;
    stretchIds?: string;
    index?: string;
  }>();

  const allStretchIds: string[] = stretchIds
    ? JSON.parse(String(stretchIds))
    : [];
  const currentStretchId = stretchId || allStretchIds[Number(index) || 0];

  const stretch: Stretch | undefined = STRETCHES.find(
    (s) => s.id === currentStretchId,
  );

  if (!stretch) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Could not find this stretch.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.buttonText}>Go back home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera permission + state
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(HOLD_DURATION_SECONDS);
  const [sessionComplete, setSessionComplete] = useState(false);

  const cameraRef = useRef<CameraView | null>(null);

  // Metrics we will send to the backend
  const [totalHoldSeconds, setTotalHoldSeconds] = useState(0);
  const [instabilityEvents, setInstabilityEvents] = useState(0);

  // Count how many times they restart (used as instability)
  const [restartCount, setRestartCount] = useState(0);

  // Ask for camera permission once
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Track when to navigate
  const [shouldNavigateSummary, setShouldNavigateSummary] = useState(false);

  // Countdown loop
  useEffect(() => {
    if (!sessionStarted || sessionComplete) return;

    const countdownTimer = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;

        // Elapsed hold time (simple timer-based approximation)
        const elapsed = HOLD_DURATION_SECONDS - next;
        setTotalHoldSeconds(
          Math.max(0, Math.min(HOLD_DURATION_SECONDS, elapsed)),
        );

        if (next <= 0) {
          clearInterval(countdownTimer);

          setSessionComplete(true);

          // Use restartCount as a rough proxy for instability
          setInstabilityEvents(restartCount);

          setShouldNavigateSummary(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(countdownTimer);
    };
  }, [sessionStarted, sessionComplete, restartCount]);

  // Navigation effect (runs after render)
  useEffect(() => {
    if (!shouldNavigateSummary) return;

    router.replace({
      pathname: "/summary",
      params: {
        stretchName: stretch.name,
        targetArea: stretch.area, // if your Stretch type has area
        totalHoldSeconds: String(totalHoldSeconds),
        instabilityEvents: String(instabilityEvents),
      },
    });

    setShouldNavigateSummary(false);
  }, [
    shouldNavigateSummary,
    router,
    stretch.name,
    stretch.area,
    totalHoldSeconds,
    instabilityEvents,
  ]);

  // Permission UI
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.text}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>
          We need your permission to use the camera.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // UI text
  let subtitle = "Step back so your whole body fits inside the box.";
  if (!isReady) {
    subtitle = "Starting camera…";
  } else if (sessionComplete) {
    subtitle = `Session complete!`;
  } else if (sessionStarted) {
    subtitle = `Hold the stretch… ${secondsLeft}s left`;
  } else {
    subtitle = "Move back until you fit inside the box, then press Start.";
  }

  const mainButtonDisabled = !isReady || (sessionStarted && !sessionComplete);

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={"front" as CameraType}
        onCameraReady={() => setIsReady(true)}
      />

      {/* Guide box */}
      <View pointerEvents="none" style={styles.guideContainer}>
        <View style={styles.guideBox} />
      </View>

      {/* Top-left home icon + stretch name */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => {
            router.replace("/");
          }}
        >
          <Text style={styles.homeIcon}>⌂</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>{stretch.name}</Text>
      </View>

      {/* Bottom subtitle + main button */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomTextContainer}>
          <Text style={styles.bottomText}>{subtitle}</Text>
          {!isReady && (
            <View style={styles.status}>
              <ActivityIndicator size="small" />
              <Text style={styles.statusText}>Preparing camera…</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            mainButtonDisabled ? styles.buttonDisabled : null,
          ]}
          onPress={() => {
            if (!isReady) return;

            if (sessionComplete) {
              // They are restarting after a completed session → count as instability
              setRestartCount((prev) => prev + 1);

              // Reset for another round
              setSessionComplete(false);
              setSessionStarted(false);
              setSecondsLeft(HOLD_DURATION_SECONDS);
              setTotalHoldSeconds(0);
              setInstabilityEvents(0);
              return;
            }

            // Starting a new session
            setSessionStarted(true);
            setSecondsLeft(HOLD_DURATION_SECONDS);
            setTotalHoldSeconds(0);
            setInstabilityEvents(0);
            console.log("Stretch hold session started");
          }}
          disabled={mainButtonDisabled}
        >
          <Text style={styles.buttonText}>
            {sessionComplete
              ? "Restart"
              : sessionStarted
              ? "Running"
              : "Lock Distance & Start"}
          </Text>
        </TouchableOpacity>
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

  topBar: {
    position: "absolute",
    top: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  homeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  homeIcon: {
    color: "#fff",
    fontSize: 18,
  },
  topTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  bottomBar: {
    position: "absolute",
    bottom: 50,
    left: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
  },
  bottomTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  bottomText: {
    color: "#ddd",
    fontSize: 13,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusText: {
    color: "#fff",
    marginLeft: 6,
    fontSize: 12,
  },

  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },

  center: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  text: { color: "#fff", textAlign: "center", marginTop: 12 },
});
