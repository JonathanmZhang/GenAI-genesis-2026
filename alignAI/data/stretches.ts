export type BodyArea = 'neck' | 'shoulders' | 'lowerBack';

export type Stretch = {
  id: string;
  area: BodyArea;
  name: string;
  shortDescription: string;
  cues: string[];          // bullet‑style cues
  holdSeconds: number;     // how long the timer should run
  mediaType: 'gif' | 'video' | 'none';
  mediaSource?: any;       // will be require('...') later
};

// For now: 1 example stretch per area.
// We can expand this to 6 total (2 per area) once the flow works.
export const STRETCHES: Stretch[] = [
  {
    id: 'neck_side_bend',
    area: 'neck',
    name: 'Seated Neck Side Bend',
    shortDescription: 'Gently lengthen the side of your neck while seated.',
    cues: [
      'Sit tall at the front of your chair, feet flat on the floor.',
      'Let your right ear slowly move toward your right shoulder.',
      'Keep shoulders relaxed and facing forward; no twisting.',
    ],
    holdSeconds: 15,
    mediaType: 'none',
  },
  {
    id: 'shoulder_rolls',
    area: 'shoulders',
    name: 'Seated Shoulder Rolls',
    shortDescription: 'Loosen up tight desk shoulders.',
    cues: [
      'Sit tall with arms relaxed by your sides.',
      'Slowly roll both shoulders up, back, and down in a circle.',
      'Move smoothly and avoid shrugging toward your ears.',
    ],
    holdSeconds: 20,
    mediaType: 'none',
  },
  {
    id: 'lower_back_seated_twist',
    area: 'lowerBack',
    name: 'Seated Gentle Twist',
    shortDescription: 'Ease stiffness in your lower back while seated.',
    cues: [
      'Sit tall with feet flat and knees aligned with hips.',
      'Place your right hand on the back of the chair, left hand on your thigh.',
      'Gently rotate your torso to the right without forcing the twist.',
    ],
    holdSeconds: 15,
    mediaType: 'none',
  },
];
