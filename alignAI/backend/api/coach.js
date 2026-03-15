// api/coach.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // Frontend expects JSON and a non-200 will trigger fallback
    res.status(200).json({
      summary: 'Coach endpoint is alive. Send a POST request with metrics to get feedback.',
      tips: ['Use POST with JSON body containing stretchName and score.'],
    });
    return;
  }

  try {
    const metrics = req.body || {};

    const stretchName =
      typeof metrics.stretchName === 'string' && metrics.stretchName.trim().length > 0
        ? metrics.stretchName
        : 'your stretch';

    const score =
      typeof metrics.score === 'number' && !Number.isNaN(metrics.score)
        ? metrics.score
        : 70;

    const aiFeedback = generateAIFeedbackStub({
      stretchName,
      score,
      targetArea: metrics.targetArea,
    });

    res.status(200).json(aiFeedback);
  } catch (err) {
    console.error('AI coach error:', err);
    // Still return 200 with fallback to avoid breaking the app
    res.status(200).json({
      summary: 'The coach had trouble reading this session, so here is general guidance.',
      tips: [
        'Move slowly into each stretch and avoid bouncing.',
        'Stay within a mild to moderate stretch sensation, not sharp pain.',
        'Breathe steadily and come out of the stretch gradually.',
      ],
    });
  }
}

function generateAIFeedbackStub({ stretchName, score, targetArea }) {
  const tips = [];
  let summary = '';
  let label = '';

  const area = targetArea ?? 'stretch';

  if (score >= 85) {
    label = 'Excellent';
    summary = `Strong ${stretchName} form overall with good consistency.`;
    tips.push(
      `Keep focusing on slow, relaxed breathing throughout the ${area} hold.`,
    );
    tips.push(
      'You can gently explore a slightly deeper range if it stays pain free.',
    );
    tips.push('Maintain this routine to lock in the mobility you’ve built.');
  } else if (score >= 60) {
    label = 'Good';
    summary = `Decent ${stretchName} form, with room to improve stability.`;
    tips.push(
      'Once you find the right position, focus on keeping your head and shoulders steady.',
    );
    tips.push(
      'Try backing off the stretch depth a bit so you can hold it more comfortably.',
    );
    tips.push(
      'Use a mirror or front camera view to keep an eye on your alignment.',
    );
  } else {
    label = 'Needs work';
    summary = `Your ${stretchName} stretch was a bit unstable this time.`;
    tips.push(
      'Start with a smaller, easier range of motion and build up gradually.',
    );
    tips.push(
      'Use a wall, chair, or desk for light support so you can focus on posture.',
    );
    tips.push(
      'Pause if you feel sharp pain; aim for gentle tension, not discomfort.',
    );
  }

  return { summary, tips, label };
}
