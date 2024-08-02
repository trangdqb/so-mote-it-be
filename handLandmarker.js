import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export class HandLandmarker {
  constructor() {
    this.predictions = [];
  }

  async initHandLandmarker() {
    const video = document.createElement('video');
    video.width = window.innerWidth;
    video.height = window.innerHeight;
    video.style.transform = 'scaleX(-1)'; // Flip the video horizontally
    document.body.appendChild(video);

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.onloadedmetadata = async () => {
      await video.play();

      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results) => {
        if (results.multiHandLandmarks.length > 0) {
          this.predictions = results.multiHandLandmarks;
        } else {
          this.predictions = [];
        }
      });

      const camera = new Camera(video, {
        onFrame: async () => {
          await hands.send({ image: video });
        },
        width: window.innerWidth,
        height: window.innerHeight,
      });

      camera.start();
    };
  }

  isMiddleAndIndexFingersUp(landmarks) {
    const indexFingerTip = landmarks[8];
    const indexFingerMCP = landmarks[5];

    const middleFingerTip = landmarks[12];
    const middleFingerMCP = landmarks[9];

    const isIndexFingerUp = indexFingerTip.y < indexFingerMCP.y;
    const isMiddleFingerUp = middleFingerTip.y < middleFingerMCP.y;

    const otherFingers = [4, 16, 20]; // Thumb, Ring, and Pinky fingers
    const areOtherFingersNotExtended = otherFingers.every((tipIndex) => {
      const fingerTip = landmarks[tipIndex];
      const fingerMCP = landmarks[tipIndex - 3];
      return fingerTip.y > fingerMCP.y;
    });

    return isIndexFingerUp && isMiddleFingerUp && areOtherFingersNotExtended;
  }

  areFourFingersUpAndThumbsDown(landmarks1, landmarks2) {
    const fingersUp = [8, 12, 16, 20]; // Index, middle, ring, pinky tips
    const thumbsDown = [4]; // Thumb tips

    const areFingersUp = (landmarks) => fingersUp.every(finger => landmarks[finger].y < landmarks[finger - 2].y);
    const areThumbsDown = (landmarks) => thumbsDown.every(thumb => landmarks[thumb].y > landmarks[thumb - 2].y);

    const distanceBetweenFingertips = (landmarks1, landmarks2) => {
      const distance = (index1, index2) => {
        const dx = landmarks1[index1].x - landmarks2[index2].x;
        const dy = landmarks1[index1].y - landmarks2[index2].y;
        const dz = landmarks1[index1].z - landmarks2[index2].z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      };
      return distance(8, 8) + distance(4, 4);
    };

    return landmarks1 && landmarks2 && landmarks1.length >= 21 && landmarks2.length >= 21 &&
           areFingersUp(landmarks1) && areThumbsDown(landmarks1) && 
           areFingersUp(landmarks2) && areThumbsDown(landmarks2) && 
           distanceBetweenFingertips(landmarks1, landmarks2) < 0.2;
  }

  areBothHandsIndexPinkyFingersUp(landmarks1, landmarks2) {
    const indexPinkyFingersUp = (landmarks) => {
      const indexFingerTip = landmarks[8];
      const indexFingerMCP = landmarks[5];

      const pinkyFingerTip = landmarks[20];
      const pinkyFingerMCP = landmarks[17];

      const isIndexFingerUp = indexFingerTip.y < indexFingerMCP.y -0.1;
      const isPinkyFingerUp = pinkyFingerTip.y < pinkyFingerMCP.y -0.1;

      const otherFingers = [4, 12, 16]; // Thumb, Middle, and Ring fingers
      const areOtherFingersNotExtended = otherFingers.every((tipIndex) => {
        const fingerTip = landmarks[tipIndex];
        const fingerMCP = landmarks[tipIndex - 3];
        return fingerTip.y > fingerMCP.y;
      });

      return isIndexFingerUp && isPinkyFingerUp && areOtherFingersNotExtended;
    };

    const distanceBetweenHands = (landmarks1, landmarks2) => {
      const distance = (index1, index2) => {
        const dx = landmarks1[index1].x - landmarks2[index2].x;
        const dy = landmarks1[index1].y - landmarks2[index2].y;
        const dz = landmarks1[index1].z - landmarks2[index2].z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      };
      return distance(8, 8) + distance(20, 20) < 0.05;
    };

    return landmarks1 && landmarks2 && landmarks1.length >= 21 && landmarks2.length >= 21 &&
           indexPinkyFingersUp(landmarks1) && indexPinkyFingersUp(landmarks2) &&
           distanceBetweenHands(landmarks1, landmarks2) < 0.1;
  }
}