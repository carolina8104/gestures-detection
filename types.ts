/**
 * Represents a single landmark point in 3D space detected by MediaPipe.
 * Each landmark corresponds to a body keypoint (e.g., shoulder, elbow, wrist).
 */
export interface Landmark {
  x: number;              // Normalized x coordinate (0-1)
  y: number;              // Normalized y coordinate (0-1)
  z: number;              // Depth coordinate relative to hips
  visibility?: number;    // Optional visibility score (0-1)
}

/**
 * Enumeration of all supported gestures in the pose detection system.
 * Each gesture represents a distinct body pose or movement pattern.
 */
export enum Gesture {
  ELEVATE_LEFT = 'Elevate Left',           // Left arm raised above shoulder
  ELEVATE_RIGHT = 'Elevate Right',         // Right arm raised above shoulder
  T_STOP_LEFT = 'T-Stop Left',             // Left arm extended horizontally
  T_STOP_RIGHT = 'T-Stop Right',           // Right arm extended horizontally
  WAVE_LEFT = 'Wave Left',                 // Left arm raised at 50-130 degrees
  WAVE_RIGHT = 'Wave Right',               // Right arm raised at 50-130 degrees
  ROTATION = 'Shoulder Rotation',          // Torso rotation with shoulders
  MARCH_LEFT = 'March Left',               // Left knee raised (marching motion)
  MARCH_RIGHT = 'March Right',             // Right knee raised (marching motion)
  UNKNOWN = 'Desconhecido',                // Unrecognized pose
  NONE = 'Nenhuma Pose Detetada'          // No pose detected
}

/**
 * Result object returned after processing a frame for gesture detection.
 * Contains the detected landmarks, identified gesture, and confidence metrics.
 */
export interface DetectionResult {
  landmarks: Landmark[][];  // Array of landmark arrays (supports multiple people)
  gesture: Gesture;         // The identified gesture from the current frame
  confidence: number;       // Detection confidence score (0-1)
  score: number;           // Score points awarded for executing the gesture
}