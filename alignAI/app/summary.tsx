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

type SessionMetricsForBackend = {
  stretchName: string;
  targetArea?: "neck" | "shoulders" | "lower_back";
  totalHoldSeconds: number;
  instabilityEvents: number;
};

type CoachingFeedback = {
  score: number;
  summary: string;
  tips: string[];
  label?: string;
};

// Local fallback mini‑coach if backend fails
function localScoreAndFeedback(
  metrics: SessionMetricsForBackend,
): CoachingFeedback {
  const { stretchName, targetArea, totalHoldSeconds, instabilityEvents } =
    metrics;

  // Same simple scoring as backend stub
  const maxHold = 20;
  const holdRatio = Math.max(
    0,
    Math.min(1, totalHoldSeconds / maxHold),
  ); // 0–1

  const baseScore = 40 + holdRatio * 60; // 40–100
  const instabilityPenalty = Math.min(instabilityEvents, 5) * 8;

  let score = Math.round(baseScore - instabilityPenalty);
  score = Math.max(0, Math.min(100, score));

  const area = targetArea ?? "stretch";

  let summary = "";
  const tips: string[] = [];
  let label = "";

  const holdText =
    totalHoldSeconds >= 18
      ? "a strong hold time"
      : totalHoldSeconds >= 10
      ? "a decent hold time"
      : "a relatively short hold";

  const instabilityText =
    instabilityEvents === 0
      ? "very steady"
      : instabilityEvents <= 2
      ? "mostly steady with a few wobbles"
      : "quite wobbly at times";

  if (score >= 85) {
    label = "Excellent";
    summary = `Great work: your ${stretchName} showed ${holdText} and ${instabilityText}.`;
    tips.push(
      `On your next ${area} stretch, see if you can keep the same steadiness while slightly easing deeper into the range.`,
    );
    tips.push(
      "Keep your breathing slow and even; let each exhale help you soften into the position.",
    );
    tips.push(
      "If this felt easy, repeat later today or add one more set to lock in the gains.",
    );
  } else if (score >= 60) {
    label = "Good";
    summary = `Solid effort on ${stretchName}, with ${holdText} but ${instabilityText}.`;
    tips.push(
      "Next round, try entering the stretch more slowly to reduce wobble in the first few seconds.",
    );
    tips.push(
      "If you felt unstable, shorten the range just a bit so you can stay balanced.",
    );
    tips.push(
      "Aim to add 3–5 more seconds of comfortable hold time on your next attempt.",
    );
  } else {
    label = "Needs work";
    summary = `This ${stretchName} attempt had ${holdText} and was ${instabilityText}, which is totally normal when you’re learning.`;
    tips.push(
      "Start smaller: use a gentler range so you can stay in position without fighting to hold it.",
    );
    tips.push(
      "Use a wall, chair, or desk for support so your neck and shoulders can relax.",
    );
    tips.push(
      "If today felt rough, repeat this stretch tomorrow at a lower intensity and focus on smooth breathing.",
    );
  }

  return { score, summary, tips, label };
}

// Call your Vercel coach API
async function fetchAICoachingFeedback(
  metrics: SessionMetricsForBackend,
): Promise<CoachingFeedback> {
  const url = "https://alignai-test.vercel.app/api/coach";

  console.log("Sending metrics to coach:", metrics);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metrics),
  });

  console.log("Coach status:", res.status);

  let data: any;
  try {
    data = await res.json();
    console.log("Coach response JSON:", data);
  } catch (e) {
    console.log("Coach JSON parse error:", e);
    throw new Error("Invalid JSON from coach");
  }

  const score =
    typeof data.score === "number" && !Number.isNaN(data.score)
      ? data.score
      : localScoreAndFeedback(metrics).score;

  return {
    score,
    summary:
      typeof data.summary === "string"
        ? data.summary
        : "Here’s some general guidance for your stretch.",
    tips:
      Array.isArray(data.tips) && data.tips.length > 0
        ? data.tips
        : localScoreAndFeedback(metrics).tips,
    label:
      typeof data.label === "string"
        ? data.label
        : localScoreAndFeedback(metrics).label,
  };
}

export default function SummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    stretchName?: string;
    targetArea?: string;
    totalHoldSeconds?: string;
    instabilityEvents?: string;
  }>();

  const stretchName = params.stretchName ?? "Stretch";

  const metrics: SessionMetricsForBackend = useMemo(
    () => ({
      stretchName,
      targetArea:
        params.targetArea === "neck" ||
        params.targetArea === "shoulders" ||
        params.targetArea === "lower_back"
          ? params.targetArea
          : undefined,
      totalHoldSeconds: Number(params.totalHoldSeconds ?? 0) || 0,
      instabilityEvents: Number(params.instabilityEvents ?? 0) || 0,
    }),
    [
      stretchName,
      params.targetArea,
      params.totalHoldSeconds,
      params.instabilityEvents,
    ],
  );

  const fallback = useMemo(
    () => localScoreAndFeedback(metrics),
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

    run();

    return () => {
      cancelled = true;
    };
  }, [metrics]);

  const feedback = aiFeedback ?? fallback;
  const label = feedback.label ?? fallback.label ?? "";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{stretchName}</Text>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Form score</Text>
          <Text style={styles.scoreValue}>{feedback.score}/100</Text>
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
