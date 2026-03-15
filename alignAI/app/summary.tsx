import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

type SessionMetrics = {
  stretchName: string;
  durationSeconds: number;
  completed: boolean;
  score: number;
  targetArea?: "neck" | "shoulders" | "lower_back";
  perceivedEffort?: "easy" | "medium" | "hard";
};

type CoachingFeedback = {
  summary: string;
  tips: string[];
  label?: string;
};

// Local fallback “mini‑coach”
function generateCoachingFeedback(metrics: SessionMetrics): CoachingFeedback {
  const { stretchName, score, targetArea } = metrics;

  let summary = "";
  const tips: string[] = [];
  let label = "";

  const area = targetArea ?? "stretch";

  if (score >= 85) {
    label = "Excellent";
    summary = `Strong ${stretchName} form overall with good consistency.`;
    tips.push(
      `Keep focusing on slow, relaxed breathing throughout the ${area} hold.`,
    );
    tips.push(
      "You can gently explore a slightly deeper range if it stays pain free.",
    );
    tips.push("Maintain this routine to lock in the mobility you’ve built.");
  } else if (score >= 60) {
    label = "Good";
    summary = `Decent ${stretchName} form, with room to improve stability.`;
    tips.push(
      "Once you find the right position, focus on keeping your head and shoulders steady.",
    );
    tips.push(
      "Try backing off the stretch depth a bit so you can hold it more comfortably.",
    );
    tips.push(
      "Use a mirror or front camera view to keep an eye on your alignment.",
    );
  } else {
    label = "Needs work";
    summary = `Your ${stretchName} stretch was a bit unstable this time.`;
    tips.push(
      "Start with a smaller, easier range of motion and build up gradually.",
    );
    tips.push(
      "Use a wall, chair, or desk for light support so you can focus on posture.",
    );
    tips.push(
      "Pause if you feel sharp pain; aim for gentle tension, not discomfort.",
    );
  }

  return { summary, tips, label };
}

// Call your Vercel coach API
async function fetchAICoachingFeedback(
  metrics: SessionMetrics,
): Promise<CoachingFeedback> {
  const url = "https://alignai-psi.vercel.app/api/coach";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metrics),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch AI feedback");
  }

  const data = (await res.json()) as { summary: string; tips: string[] };
  return {
    summary: data.summary,
    tips: data.tips,
  };
}

export default function SummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    stretchName?: string;
    formScore?: string;
    targetArea?: string;
  }>();

  const stretchName = params.stretchName ?? "Stretch";
  const score = Number(params.formScore ?? 0);

  const metrics: SessionMetrics = useMemo(
    () => ({
      stretchName,
      durationSeconds: 10,
      completed: true,
      score: isNaN(score) ? 0 : score,
      targetArea:
        params.targetArea === "neck" ||
        params.targetArea === "shoulders" ||
        params.targetArea === "lower_back"
          ? params.targetArea
          : undefined,
    }),
    [stretchName, score, params.targetArea],
  );

  const localFallback = useMemo(
    () => generateCoachingFeedback(metrics),
    [metrics],
  );

  const [aiFeedback, setAiFeedback] = useState<CoachingFeedback | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setAiLoading(true);
      setAiError(null);
      try {
        const result = await fetchAICoachingFeedback(metrics);
        if (!cancelled) {
          setAiFeedback(result);
        }
      } catch (e) {
        if (!cancelled) {
          setAiError(
            "AI coaching is unavailable right now. Showing local guidance instead.",
          );
          setAiFeedback(null);
        }
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    };

    // Call the real AI backend
    run();

    return () => {
      cancelled = true;
    };
  }, [metrics]);

  const feedback = aiFeedback ?? localFallback;
  const label = feedback.label ?? localFallback.label ?? "";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{stretchName}</Text>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Form score</Text>
          <Text style={styles.scoreValue}>{metrics.score}/100</Text>
          {!!label && <Text style={styles.scoreTag}>{label}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session insight</Text>
          {aiLoading && (
            <View style={styles.inlineRow}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.loadingText}> Getting AI coaching…</Text>
            </View>
          )}
          {aiError && <Text style={styles.errorText}>{aiError}</Text>}
          <Text style={styles.sectionText}>{feedback.summary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next‑stretch tips</Text>
          {feedback.tips.map((tip, index) => (
            <Text key={index} style={styles.tipText}>
              • {tip}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What to try next</Text>
          <Text style={styles.sectionText}>
            Repeat this stretch once more today, then try a different area that
            feels tight so your routine stays balanced.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.buttonSecondaryText}>Back to home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => {
            router.replace("/");
          }}
        >
          <Text style={styles.buttonPrimaryText}>Do another stretch</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 24,
  },
  scoreCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2e7d32",
    marginBottom: 24,
  },
  scoreLabel: {
    color: "#aaaaaa",
    fontSize: 13,
    marginBottom: 4,
  },
  scoreValue: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "700",
  },
  scoreTag: {
    marginTop: 4,
    color: "#a5d6a7",
    fontSize: 13,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  sectionText: {
    color: "#cccccc",
    fontSize: 14,
    lineHeight: 20,
  },
  tipText: {
    color: "#cccccc",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  loadingText: {
    color: "#a5d6a7",
    fontSize: 13,
    marginLeft: 6,
  },
  errorText: {
    color: "#ef9a9a",
    fontSize: 13,
    marginBottom: 4,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#050505",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondaryText: {
    color: "#eeeeee",
    fontSize: 14,
    fontWeight: "500",
  },
  buttonPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimaryText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
