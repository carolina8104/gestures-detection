import { Gesture } from '../types';

// Detection threshold constants for Python code generation
// These values should match the thresholds used in GestureCanvas.tsx
const DETECTION_THRESHOLDS = {
  ARM_ANGLE_ELEVATED: 150,
  ARM_ANGLE_HORIZONTAL: 160,
  ARM_ANGLE_WAVE_MIN: 50,
  ARM_ANGLE_WAVE_MAX: 130,
  Y_ALIGNMENT_TOLERANCE: 0.1,
  SHOULDER_ROTATION: 0.15,
  KNEE_ANGLE_MARCH: 160,
  KNEE_RAISE_THRESHOLD: 0.2
};

/**
 * Generates Python code for detecting a specific gesture using MediaPipe.
 * Each gesture has its own detection algorithm based on landmark positions and angles.
 * 
 * @param gesture - The gesture type to generate Python detection code for
 * @returns Python code as a string that can detect the specified gesture
 */
export function generatePythonCode(gesture: Gesture): string {
  // Common Python imports and setup code used by all gestures
  const baseCode = `import cv2
import mediapipe as mp
import numpy as np

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
pose = mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

def calculate_angle(a, b, c):
    """
    Calculate angle between three points.
    Args:
        a, b, c: Points as [x, y] coordinates
    Returns:
        Angle in degrees
    """
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
        
    return angle

`;

  // Generate gesture-specific detection code based on gesture type
  switch (gesture) {
    case Gesture.ELEVATE_LEFT:
      return baseCode + `
# Elevate Left - Detect left arm raised above shoulder
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    # Convert to RGB
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)
    
    # Convert back to BGR
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # Get coordinates for left arm
        left_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].x,
                        landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y]
        left_elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].x,
                     landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].y]
        left_wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST].x,
                     landmarks[mp_pose.PoseLandmark.LEFT_WRIST].y]
        
        # Calculate arm angle
        angle = calculate_angle(left_shoulder, left_elbow, left_wrist)
        
        # Check if arm is elevated (angle > 150° and wrist above shoulder)
        if angle > 150 and left_wrist[1] < left_shoulder[1]:
            cv2.putText(image, 'ELEVATE LEFT DETECTED', (50, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        # Draw pose landmarks
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    
    cv2.imshow('Elevate Left Detection', image)
    
    if cv2.waitKey(10) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
`;

    case Gesture.ELEVATE_RIGHT:
      return baseCode + `
# Elevate Right - Detect right arm raised above shoulder
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # Get coordinates for right arm
        right_shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].x,
                         landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].y]
        right_elbow = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW].x,
                      landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW].y]
        right_wrist = [landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].x,
                      landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].y]
        
        # Calculate arm angle
        angle = calculate_angle(right_shoulder, right_elbow, right_wrist)
        
        # Check if arm is elevated (angle > 150° and wrist above shoulder)
        if angle > 150 and right_wrist[1] < right_shoulder[1]:
            cv2.putText(image, 'ELEVATE RIGHT DETECTED', (50, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    
    cv2.imshow('Elevate Right Detection', image)
    
    if cv2.waitKey(10) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
`;

    case Gesture.T_STOP_LEFT:
      return baseCode + `
# T-Stop Left - Detect left arm extended horizontally
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # Get coordinates for left arm
        left_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].x,
                        landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y]
        left_elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].x,
                     landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].y]
        left_wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST].x,
                     landmarks[mp_pose.PoseLandmark.LEFT_WRIST].y]
        
        # Calculate arm angle
        angle = calculate_angle(left_shoulder, left_elbow, left_wrist)
        
        # Check if arm is horizontal (wrist aligned with shoulder on y-axis)
        y_diff = abs(left_wrist[1] - left_shoulder[1])
        if angle > 160 and y_diff < 0.1:
            cv2.putText(image, 'T-STOP LEFT DETECTED', (50, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    
    cv2.imshow('T-Stop Left Detection', image)
    
    if cv2.waitKey(10) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
`;

    case Gesture.T_STOP_RIGHT:
      return baseCode + `
# T-Stop Right - Detect right arm extended horizontally
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # Get coordinates for right arm
        right_shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].x,
                         landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].y]
        right_elbow = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW].x,
                      landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW].y]
        right_wrist = [landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].x,
                      landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].y]
        
        # Calculate arm angle
        angle = calculate_angle(right_shoulder, right_elbow, right_wrist)
        
        # Check if arm is horizontal (wrist aligned with shoulder on y-axis)
        y_diff = abs(right_wrist[1] - right_shoulder[1])
        if angle > 160 and y_diff < 0.1:
            cv2.putText(image, 'T-STOP RIGHT DETECTED', (50, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    
    cv2.imshow('T-Stop Right Detection', image)
    
    if cv2.waitKey(10) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
`;

    case Gesture.WAVE_LEFT:
      return baseCode + `
# Wave Left - Detect left arm raised at 50-130 degrees
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # Get coordinates for left arm
        left_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].x,
                        landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y]
        left_elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].x,
                     landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].y]
        left_wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST].x,
                     landmarks[mp_pose.PoseLandmark.LEFT_WRIST].y]
        
        # Calculate arm angle
        angle = calculate_angle(left_shoulder, left_elbow, left_wrist)
        
        # Check if arm is in wave position (50-130 degrees, wrist above shoulder)
        if 50 < angle < 130 and left_wrist[1] < left_shoulder[1]:
            cv2.putText(image, 'WAVE LEFT DETECTED', (50, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    
    cv2.imshow('Wave Left Detection', image)
    
    if cv2.waitKey(10) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
`;

    case Gesture.WAVE_RIGHT:
      return baseCode + `
# Wave Right - Detect right arm raised at 50-130 degrees
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # Get coordinates for right arm
        right_shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].x,
                         landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].y]
        right_elbow = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW].x,
                      landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW].y]
        right_wrist = [landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].x,
                      landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].y]
        
        # Calculate arm angle
        angle = calculate_angle(right_shoulder, right_elbow, right_wrist)
        
        # Check if arm is in wave position (50-130 degrees, wrist above shoulder)
        if 50 < angle < 130 and right_wrist[1] < right_shoulder[1]:
            cv2.putText(image, 'WAVE RIGHT DETECTED', (50, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    
    cv2.imshow('Wave Right Detection', image)
    
    if cv2.waitKey(10) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
`;

    case Gesture.ROTATION:
      return baseCode + `
# Rotation - Detect torso rotation based on shoulder positions
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # Get shoulder coordinates
        left_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].x,
                        landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y,
                        landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].z]
        right_shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].x,
                         landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].y,
                         landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].z]
        
        # Calculate shoulder distance (smaller = more rotation)
        shoulder_distance = abs(left_shoulder[0] - right_shoulder[0])
        
        # Check for rotation (shoulders closer together than normal)
        if shoulder_distance < 0.15:
            cv2.putText(image, 'ROTATION DETECTED', (50, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    
    cv2.imshow('Rotation Detection', image)
    
    if cv2.waitKey(10) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
`;

    case Gesture.MARCH_LEFT:
      return baseCode + `
# March Left - Detect left knee raised (marching motion)
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # Get coordinates for left leg
        left_hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP].x,
                   landmarks[mp_pose.PoseLandmark.LEFT_HIP].y]
        left_knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE].x,
                    landmarks[mp_pose.PoseLandmark.LEFT_KNEE].y]
        left_ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE].x,
                     landmarks[mp_pose.PoseLandmark.LEFT_ANKLE].y]
        
        # Calculate knee angle
        angle = calculate_angle(left_hip, left_knee, left_ankle)
        
        # Check if knee is raised (angle < 160, knee above ankle significantly)
        if angle < 160 and left_knee[1] < left_ankle[1] - 0.2:
            cv2.putText(image, 'MARCH LEFT DETECTED', (50, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    
    cv2.imshow('March Left Detection', image)
    
    if cv2.waitKey(10) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
`;

    case Gesture.MARCH_RIGHT:
      return baseCode + `
# March Right - Detect right knee raised (marching motion)
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # Get coordinates for right leg
        right_hip = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP].x,
                    landmarks[mp_pose.PoseLandmark.RIGHT_HIP].y]
        right_knee = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE].x,
                     landmarks[mp_pose.PoseLandmark.RIGHT_KNEE].y]
        right_ankle = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE].x,
                      landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE].y]
        
        # Calculate knee angle
        angle = calculate_angle(right_hip, right_knee, right_ankle)
        
        # Check if knee is raised (angle < 160, knee above ankle significantly)
        if angle < 160 and right_knee[1] < right_ankle[1] - 0.2:
            cv2.putText(image, 'MARCH RIGHT DETECTED', (50, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    
    cv2.imshow('March Right Detection', image)
    
    if cv2.waitKey(10) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
`;

    default:
      return baseCode + `
# Generic pose detection
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    if results.pose_landmarks:
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    
    cv2.imshow('Pose Detection', image)
    
    if cv2.waitKey(10) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
`;
  }
}
