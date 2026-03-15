import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { STRETCHES, Stretch } from './data/stretches';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { scoreNeckSideBendRight, PoseLandmarks } from './data/neckScore';

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
        'End session?',
        'Do you want to stop this stretch and go back?',
        [
          { text: 'No', style: 'cancel', onPress: () => {} },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: () => {
              router.replace('/');
            },
          },
        ]
      );
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [router]);

  // Read params for current stretch
  const { stretchId, stretchIds, index } = useLocalSearchParams<{
    stretchId?: string;
    stretchIds?: string;
    index?: string;
  }>();

  const allStretchIds: string[] = stretchIds ? JSON.parse(String(stretchIds)) : [];
  const currentStretchId = stretchId || allStretchIds[Number(index) || 0];

  const stretch: Stretch | undefined = STRETCHES.find(
    (s) => s.id === currentStretchId
  );

  // if something went wrong with params, show a simple error screen
  if (!stretch) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Could not find this stretch.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>Go back home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera + session state
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(HOLD_DURATION_SECONDS);
  const [sessionComplete, setSessionComplete] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  // scores across frames for this hold (ref so updates don't trigger renders)
  const frameScoresRef = useRef<number[]>([]);

  function handlePoseFrame(pose: PoseLandmarks) {
    const score = scoreNeckSideBendRight(pose);
    frameScoresRef.current = [...frameScoresRef.current, score];
  }

  // Determine which body region has the highest reported discomfort
  const areas = [
    { key: 'neck' as const, score: neck },
    { key: 'shoulders' as const, score: shoulders },
    { key: 'lowerBack' as const, score: lowerBack },
  ];
  areas.sort((a, b) => b.score - a.score);

  const top = areas[0];
  const focusArea: 'neck' | 'shoulders' | 'lowerBack' | 'none' =
    top && top.score > 0 ? top.key : 'none';
  const maxScore = top ? top.score : 0;

  // Ask for camera permission once
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // NEW: track navigation to summary and final score
  const [shouldNavigateSummary, setShouldNavigateSummary] = useState(false);
  const [finalFormScore, setFinalFormScore] = useState(0);

  // Countdown logic (no router calls here)
  useEffect(() => {
    if (!sessionStarted || sessionComplete) return;

    const intervalId = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          setSessionComplete(true);

          const scores = frameScoresRef.current;
          const averageScore =
            scores.length > 0
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : 0;

          setFinalFormScore(averageScore);
          setShouldNavigateSummary(true);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [sessionStarted, sessionComplete]);

  // Navigation effect (runs after render)
  useEffect(() => {
    if (!shouldNavigateSummary) return;

    router.replace({
      pathname: '/summary',
      params: {
        stretchName: stretch.name,
        formScore: String(finalFormScore),
      },
    });

    setShouldNavigateSummary(false);
  }, [shouldNavigateSummary, finalFormScore, router, stretch.name]);

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
        <Text style={styles.text}>We need your permission to use the camera.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  let subtitle = 'Step back so your whole body fits inside the box.';
  if (!isReady) {
    subtitle = 'Starting camera…';
  } else if (sessionComplete) {
    subtitle = 'Session complete! Nice work.';
  } else if (sessionStarted) {
    subtitle = `Hold the stretch… ${secondsLeft}s left`;
  } else if (focusArea !== 'none') {
    const areaLabel =
      focusArea === 'neck'
        ? 'neck'
        : focusArea === 'shoulders'
        ? 'shoulders'
        : 'lower back';

    subtitle = `Focusing on your ${areaLabel} (discomfort ${maxScore}/10). Step into the box.`;
  }

  const mainButtonDisabled = !isReady || (sessionStarted && !sessionComplete);

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        onCameraReady={() => setIsReady(true)}
        // NOTE: handlePoseFrame is defined but not wired yet; you'll plug it
        // into a frame processor later when you move to VisionCamera
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
            router.replace('/');
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
          style={[styles.button, mainButtonDisabled ? styles.buttonDisabled : null]}
          onPress={() => {
            if (!isReady) return;

            if (sessionComplete) {
              setSessionComplete(false);
              setSessionStarted(false);
              setSecondsLeft(HOLD_DURATION_SECONDS);
              frameScoresRef.current = [];
              return;
            }

            setSessionStarted(true);
            setSecondsLeft(HOLD_DURATION_SECONDS);
            frameScoresRef.current = [];
            console.log('Stretch hold session started');
          }}
          disabled={mainButtonDisabled}
        >
          <Text style={styles.buttonText}>
            {sessionComplete
              ? 'Restart'
              : sessionStarted
              ? 'Running'
              : 'Lock Distance & Start'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },

  guideContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideBox: {
    width: '80%',
    height: '75%',
    borderColor: '#4CAF50',
    borderWidth: 2,
    borderRadius: 16,
    backgroundColor: 'transparent',
    marginTop: -40,
  },

  topBar: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  homeIcon: {
    color: '#fff',
    fontSize: 18,
  },
  topTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 50,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  bottomTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  bottomText: {
    color: '#ddd',
    fontSize: 13,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 12,
  },

  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },

  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  text: { color: '#fff', textAlign: 'center', marginTop: 12 },
});