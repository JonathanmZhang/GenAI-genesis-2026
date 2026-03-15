// api/coach.js

import OpenAI from "openai";

// OpenRouter (OpenAI-compatible) client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // your OpenRouter API key
  baseURL: "https://openrouter.ai/api/v1", // OpenRouter base URL[web:802]
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

    // Harsher baseline so weak sessions get low scores
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

// Harsher baseline scoring
function computeBaselineScore({ totalHoldSeconds, instabilityEvents }) {
  const maxHold = 20;
  const holdRatio = Math.max(0, Math.min(1, totalHoldSeconds / maxHold)); // 0–1

  // Stricter scale:
  // - Very short holds get poor scores.
  // - Full holds can reach high scores but not 100 without stability.
  let baseScore = 20 + holdRatio * 60; // 20–80

  // Bigger penalty per instability event
  const instabilityPenalty = Math.min(instabilityEvents, 5) * 10;

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

  const response = await client.chat.completions.create({
    model: "openrouter/free", // free router; you can swap to a specific free model[web:800][web:802]
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a physiotherapist and movement coach.\n" +
          "You receive simple metrics from a webcam stretch session.\n" +
          "Use stretchName and targetArea to make exercise-specific comments.\n" +
          "Your job is to output a JSON object with:\n" +
          "- score: integer 0-100\n" +
          "- label: one of 'Excellent', 'Good', 'Needs work'\n" +
          "- summary: 1-2 sentences\n" +
          "- tips: 3-5 concrete bullet points.\n" +
          "Each tip must mention either the named stretch or the target body area (e.g. 'for Seated Neck Side Bend', 'for your neck', 'for your shoulders').\n" +
          "Score must stay within ±5 of baselineScore and be noticeably lower for short, unstable holds." +
          "keep in mind that we are  only asking for 10 seconds, so time shouldn't be a big factor for the score",
      },
      {
        role: "user",
        content: JSON.stringify({
          stretchName,
          targetArea: area,
          totalHoldSeconds,
          instabilityEvents,
          baselineScore,
          guidelines: {
            stretchExamples: [
              "Seated Neck Side Bend: sitting, tilting one ear toward the shoulder.",
              "Desk Shoulder Opener: hands on desk, chest dropping between arms.",
              "Chair Hip Stretch: ankle on opposite knee, leaning forward.",
            ],
          },
        }),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  let parsed;
  try {
    parsed = content && JSON.parse(content);
  } catch {
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
      ? Math.max(
          0,
          Math.min(
            100,
            // Clamp model score around baseline (±5)
            Math.round(
              Math.max(
                baselineScore - 5,
                Math.min(baselineScore + 5, parsed.score),
              ),
            ),
          ),
        )
      : baselineScore;

  const fallbackBase = fallbackCoachingFromBaseline({
    stretchName,
    area,
    score,
  });

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : fallbackBase.summary;

  const tips =
    Array.isArray(parsed.tips) && parsed.tips.length > 0
      ? parsed.tips
          .filter((t) => typeof t === "string" && t.trim().length > 0)
          .slice(0, 5)
      : fallbackBase.tips;

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
    summary = `Great work: your ${stretchName} looked very steady with good control (coached-by-ai).`;
    tips.push(
      `On your next ${area} stretch, keep this same steadiness and experiment with 2–3 extra seconds of hold time.`,
    );
    tips.push(
      `For ${stretchName}, keep your breathing slow and even so your neck and shoulders stay relaxed.`,
    );
    tips.push(
      `If ${stretchName} felt easy, add a second set later today to reinforce the pattern.`,
    );
  } else if (score >= 60) {
    summary = `Solid effort on ${stretchName}, with some room to improve stability and comfort (coached-by-ai).`;
    tips.push(
      `On the next ${stretchName}, move into the position more slowly to reduce wobble in the first few seconds.`,
    );
    tips.push(
      `If your ${area} felt unstable during ${stretchName}, shorten the range slightly so you can stay balanced.`,
    );
    tips.push(
      `Aim to add 3–5 seconds of comfortable hold time on your next ${stretchName}.`,
    );
  } else {
    summary = `This ${stretchName} attempt was challenging, which is normal when you’re still learning the position (coached-by-ai).`;
    tips.push(
      `For ${stretchName}, start with a gentler range so you can stay in position without fighting to hold it.`,
    );
    tips.push(
      `Use a wall, chair, or desk for light support so your ${area} can relax during ${stretchName}.`,
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
