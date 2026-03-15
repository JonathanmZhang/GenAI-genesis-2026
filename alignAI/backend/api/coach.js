// api/coach.js

/**
 * Vercel serverless function for stretch coaching.
 * For now this is a stub that behaves like an AI coach.
 * Later you can replace generateAIFeedbackStub with a real LLM call.
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const metrics = req.body;

    // Basic validation
    if (!metrics || typeof metrics.stretchName !== "string") {
      res.status(400).json({ error: "Invalid metrics payload" });
      return;
    }

    // Stubbed AI feedback for now
    const aiFeedback = generateAIFeedbackStub(metrics);

    res.status(200).json(aiFeedback);
  } catch (err) {
    console.error("AI coach error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Simple rules-based coach that imitates AI feedback.
 * metrics is your SessionMetrics object from the app.
 */
function generateAIFeedbackStub(metrics) {
  const { stretchName, score } = metrics;
  const tips = [];
  let summary = "";

  if (score >= 85) {
    summary = `Strong ${stretchName} form overall with good consistency.`;
    tips.push("Keep breathing slowly and avoid bouncing into the end range.");
    tips.push(
      "You can gently explore a slightly deeper range if it stays pain free.",
    );
    tips.push("Maintain this routine to lock in your mobility gains.");
  } else if (score >= 60) {
    summary = `Decent ${stretchName} form, with some room to improve stability.`;
    tips.push(
      "Once you find the right position, try to keep your head and shoulders still.",
    );
    tips.push(
      "Reduce the stretch depth slightly so you can hold it more comfortably.",
    );
    tips.push("Focus on a smooth entry into and out of the stretch.");
  } else {
    summary = `Your ${stretchName} stretch looked a bit unstable this time.`;
    tips.push("Start with a smaller range of motion and build up gradually.");
    tips.push(
      "Use a wall or chair for light support so you can focus on posture.",
    );
    tips.push(
      "Pause if you feel sharp pain; aim for gentle, controlled tension only.",
    );
  }

  return { summary, tips };
}
