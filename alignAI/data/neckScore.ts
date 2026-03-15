// data/neckScore.ts

export type Point = {
    x: number;
    y: number;
  };
  
  export type PoseLandmarks = {
    leftShoulder: Point;
    rightShoulder: Point;
    leftHip: Point;
    rightHip: Point;
    leftEar: Point;
    rightEar: Point;
  };
  
  function angleDegrees(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const rad = Math.atan2(dy, dx);
    return (rad * 180) / Math.PI;
  }
  
  function clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
  }
  
  // Scores a right-side neck side-bend on a 0–100 scale.
  export function scoreNeckSideBendRight(pose: PoseLandmarks): number {
    const midShoulder: Point = {
      x: (pose.leftShoulder.x + pose.rightShoulder.x) / 2,
      y: (pose.leftShoulder.y + pose.rightShoulder.y) / 2,
    };
  
    const midHip: Point = {
      x: (pose.leftHip.x + pose.rightHip.x) / 2,
      y: (pose.leftHip.y + pose.rightHip.y) / 2,
    };
  
    const headCenter: Point = {
      x: (pose.leftEar.x + pose.rightEar.x) / 2,
      y: (pose.leftEar.y + pose.rightEar.y) / 2,
    };
  
    // 1) Neck tilt toward right (want some tilt, not too little or too much)
    const neckAngle = angleDegrees(midShoulder, headCenter); // 90° is straight up
    const tiltFromVertical = neckAngle - 90; // positive => tilt to the right
  
    const idealMin = 15;
    const idealMax = 35;
    const hardMin = 5;
    const hardMax = 45;
  
    let neckTiltScore = 0;
    if (tiltFromVertical <= hardMin || tiltFromVertical >= hardMax) {
      neckTiltScore = 0;
    } else if (tiltFromVertical >= idealMin && tiltFromVertical <= idealMax) {
      neckTiltScore = 1;
    } else if (tiltFromVertical > hardMin && tiltFromVertical < idealMin) {
      neckTiltScore =
        (tiltFromVertical - hardMin) / (idealMin - hardMin); // ramp up
    } else {
      // between idealMax and hardMax
      neckTiltScore =
        (hardMax - tiltFromVertical) / (hardMax - idealMax); // ramp down
    }
    neckTiltScore = clamp01(neckTiltScore);
  
    // 2) Shoulder levelness (want shoulders roughly horizontal)
    const shoulderAngle = angleDegrees(pose.leftShoulder, pose.rightShoulder); // 0° is horizontal
    const shoulderTilt = Math.abs(shoulderAngle);
  
    const shoulderGood = 5;
    const shoulderBad = 20;
  
    let shoulderScore = 0;
    if (shoulderTilt <= shoulderGood) {
      shoulderScore = 1;
    } else if (shoulderTilt >= shoulderBad) {
      shoulderScore = 0;
    } else {
      shoulderScore =
        (shoulderBad - shoulderTilt) / (shoulderBad - shoulderGood);
    }
    shoulderScore = clamp01(shoulderScore);
  
    // 3) Torso upright (spine near vertical)
    const spineAngle = angleDegrees(midHip, midShoulder); // 90° is straight up
    const spineTilt = Math.abs(spineAngle - 90);
  
    const spineGood = 10;
    const spineBad = 25;
  
    let spineScore = 0;
    if (spineTilt <= spineGood) {
      spineScore = 1;
    } else if (spineTilt >= spineBad) {
      spineScore = 0;
    } else {
      spineScore = (spineBad - spineTilt) / (spineBad - spineGood);
    }
    spineScore = clamp01(spineScore);
  
    const combined =
      0.5 * neckTiltScore + 0.25 * shoulderScore + 0.25 * spineScore;
  
    return Math.round(combined * 100);
  }
  