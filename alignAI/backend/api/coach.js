// api/coach.js

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).json({
      summary:
        "Coach endpoint is alive. Send POST with stretchName, totalHoldSeconds, and instabilityEvents.",
      tips: [
        "Use POST with JSON body: { stretchName, totalHoldSeconds, instabilityEvents }.",
      ],
      score: 0,
      label: "Info",
    });
    return;
  }

  try {
    const body = req.body || {};

    const stretchName =
      typeof body.stretchName === "string" && body.stretchName.trim().length > 0
        ? body.stretchName
        : "your stretch";

    const targetArea =
      typeof body.targetArea === "string" ? body.targetArea : undefined;

    const totalHoldSeconds =
      typeof body.totalHoldSeconds === "number" &&
      !Number.isNaN(body.totalHoldSeconds)
        ? body.totalHoldSeconds
        : 0;

    const instabilityEvents =
      typeof body.instabilityEvents === "number" &&
      !Number.isNaN(body.instabilityEvents) &&
      body.instabilityEvents >= 0
        ? body.instabilityEvents
        : 0;

    // Baseline heuristic so the model isn't guessing from scratch
    const baselineScore = computeBaselineScore({
      totalHoldSeconds,
      instabilityEvents,
    });

    const aiResult = await getLLMCoaching({
      stretchName,
      targetArea,
      totalHoldSeconds,
      instabilityEvents,
      baselineScore,
    });

    res.status(200).json(aiResult);
  } catch (err) {
    console.error("AI coach error:", err);
    // Fallback so the app never crashes
    res.status(200).json({
      score: 50,
      summary:
        "The AI coach had trouble processing this session, so here is general guidance.",
      tips: [
        "Move slowly into each stretch and avoid bouncing.",
        "Stay within a mild to moderate stretch sensation, not sharp pain.",
        "Breathe steadily and come out of the stretch gradually.",
      ],
      label: "Fallback",
    });
  }
}

function computeBaselineScore({ totalHoldSeconds, instabilityEvents }) {
  const maxHold = 20;
  const holdRatio = Math.max(0, Math.min(1, totalHoldSeconds / maxHold)); // 0–1

  const baseScore = 40 + holdRatio * 60; // 40–100
  const instabilityPenalty = Math.min(instabilityEvents, 5) * 8;

  let score = Math.round(baseScore - instabilityPenalty);
  return Math.max(0, Math.min(100, score));
}

async function getLLMCoaching({
  stretchName,
  targetArea,
  totalHoldSeconds,
  instabilityEvents,
  baselineScore,
}) {
  const area = targetArea ?? "stretch";

  // Use OpenAI structured JSON output
  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini", // or another JSON-capable chat model
    response_format: { type: "json_object" }, // JSON mode[web:775][web:781]
    messages: [
      {
        role: "system",
        content:
          "You are a physiotherapist and movement coach.\n" +
          "You receive simple metrics from a webcam stretch session.\n" +
          "Your job is to output a JSON object with a 0-100 score, a short 1-2 sentence summary, a label, and 3-5 concrete tips.\n" +
          "Include the phrase 'coached-by-ai' somewhere in the summary so we can confirm this text came from you.\n" +
          "Score should roughly follow the given baselineScore but you can adjust it up or down by up to 10 points based on your reasoning.",
      },
      {
        role: "user",
        content: JSON.stringify({
          stretchName,
          targetArea: area,
          totalHoldSeconds,
          instabilityEvents,
          baselineScore,
        }),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  let parsed;
  try {
    parsed = content && JSON.parse(content);
  } catch {
    // If parsing fails, fall back to a simple template using baselineScore
    const fallbackScore = baselineScore;
    const fallback = fallbackCoachingFromBaseline({
      stretchName,
      area,
      score: fallbackScore,
    });
    return fallback;
  }

  const score =
    typeof parsed.score === "number" && !Number.isNaN(parsed.score)
      ? Math.max(0, Math.min(100, Math.round(parsed.score)))
      : baselineScore;

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : fallbackCoachingFromBaseline({ stretchName, area, score }).summary;

  const tips =
    Array.isArray(parsed.tips) && parsed.tips.length > 0
      ? parsed.tips
          .filter((t) => typeof t === "string" && t.trim().length > 0)
          .slice(0, 5)
      : fallbackCoachingFromBaseline({ stretchName, area, score }).tips;

  const label =
    typeof parsed.label === "string" && parsed.label.trim().length > 0
      ? parsed.label.trim()
      : labelFromScore(score);

  return { score, summary, tips, label };
}

function fallbackCoachingFromBaseline({ stretchName, area, score }) {
  let summary = "";
  const tips = [];
  let label = labelFromScore(score);

  if (score >= 85) {
    summary = `Great work: your ${stretchName} looked very steady with good control.`;
    tips.push(
      `On your next ${area} stretch, keep this same steadiness and experiment with 2–3 extra seconds of hold time.`,
    );
    tips.push(
      "Use each exhale to let your shoulders and jaw soften a little more.",
    );
    tips.push(
      "If this felt easy, add a second set later today to reinforce the pattern.",
    );
  } else if (score >= 60) {
    summary = `Solid effort on ${stretchName}, with some room to improve stability and comfort.`;
    tips.push(
      "Next round, move into the stretch more slowly to reduce wobble in the first few seconds.",
    );
    tips.push(
      "If you felt unstable, shorten the range slightly so you can stay balanced.",
    );
    tips.push(
      "Aim to add 3–5 seconds of comfortable hold time on your next attempt.",
    );
  } else {
    summary = `This ${stretchName} attempt was challenging, which is normal when you’re still learning the position.`;
    tips.push(
      "Start smaller: pick a gentler range so you can stay in position without fighting to hold it.",
    );
    tips.push(
      "Use a wall, chair, or desk for light support so your upper body can relax.",
    );
    tips.push(
      "Focus on smooth, quiet breathing; if you need to gasp for air, ease off the stretch a bit.",
    );
  }

  return { score, summary, tips, label };
}

function labelFromScore(score) {
  if (score >= 85) return "Excellent";
  if (score >= 60) return "Good";
  return "Needs work";
}
