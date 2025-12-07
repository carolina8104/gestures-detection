import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { DetectionResult, Gesture, Landmark } from '../types';

// Detection threshold constants for gesture recognition
const THRESHOLDS = {
  ARM_ANGLE_ELEVATED: 150,      // Minimum angle for elevated arm gestures
  ARM_ANGLE_HORIZONTAL: 160,    // Minimum angle for horizontal arm (T-Stop)
  ARM_ANGLE_WAVE_MIN: 50,       // Minimum angle for wave gesture
  ARM_ANGLE_WAVE_MAX: 130,      // Maximum angle for wave gesture
  Y_ALIGNMENT_TOLERANCE: 0.1,   // Y-axis alignment tolerance for horizontal arms
  SHOULDER_ROTATION: 0.15,      // Maximum shoulder distance for rotation detection
  KNEE_RAISE_THRESHOLD: 0.1     // Minimum vertical distance for knee raise detection
};

// MediaPipe Pose Landmark indices for body keypoints
const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28
};

/**
 * Props interface for the GestureCanvas component.
 * Configures detection sensitivity and provides callback for gesture events.
 */
interface GestureCanvasProps {
  onGestureDetected: (result: DetectionResult) => void;  // Callback when gesture is detected
  targetGesture?: Gesture | null;                         // Optional target gesture for highlighting
  minHandDetectionConfidence?: number;                    // Detection confidence threshold (0-1)
  minHandPresenceConfidence?: number;                     // Presence confidence threshold (0-1)
  minTrackingConfidence?: number;                         // Tracking confidence threshold (0-1)
}

/**
 * Interface for methods exposed via ref to parent components.
 * Allows parent to control the GestureCanvas programmatically.
 */
export interface GestureCanvasRef {
  resetTracking: () => void;  // Resets pose tracking and clears detection state
}

/**
 * GestureCanvas component handles real-time pose detection and gesture recognition.
 * Uses MediaPipe Pose Landmarker to track body keypoints from webcam feed,
 * analyzes landmark positions to identify gestures, and renders visualization.
 * 
 * Features:
 * - Real-time webcam processing
 * - MediaPipe Pose detection with configurable confidence thresholds
 * - Gesture recognition based on body landmark analysis
 * - Visual feedback with skeleton overlay
 * - Score calculation for detected gestures
 */
const GestureCanvas = forwardRef<GestureCanvasRef, GestureCanvasProps>(
  ({ onGestureDetected, targetGesture, minHandDetectionConfidence = 0.5, minHandPresenceConfidence = 0.5, minTrackingConfidence = 0.5 }, ref) => {
    
    // Canvas and video element refs for rendering
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    
    // MediaPipe pose landmarker instance
    const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
    
    // Animation frame ID for cleanup
    const animationFrameRef = useRef<number | null>(null);
    
    // Component state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Last detected gesture for change detection
    const lastGestureRef = useRef<Gesture>(Gesture.NONE);

    /**
     * Expose resetTracking method to parent via ref.
     * Allows parent components to programmatically reset tracking state.
     */
    useImperativeHandle(ref, () => ({
      resetTracking: () => {
        lastGestureRef.current = Gesture.NONE;
        onGestureDetected({
          landmarks: [],
          gesture: Gesture.NONE,
          confidence: 0,
          score: 0
        });
      }
    }));

    /**
     * Initialize MediaPipe Pose Landmarker and start webcam.
     * Runs once on component mount.
     */
    useEffect(() => {
      let mounted = true;

      /**
       * Asynchronous initialization of MediaPipe and camera.
       * Downloads model files and configures pose detection.
       */
      const initializePoseDetection = async () => {
        try {
          // Load MediaPipe vision tasks
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );

          // Create pose landmarker with configuration
          const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numPoses: 1,  // Track single person for performance
            minPoseDetectionConfidence: minHandDetectionConfidence,
            minPosePresenceConfidence: minHandPresenceConfidence,
            minTrackingConfidence: minTrackingConfidence
          });

          if (!mounted) return;

          poseLandmarkerRef.current = poseLandmarker;

          // Start camera feed
          await startCamera();
          
          setIsLoading(false);
        } catch (err) {
          console.error('Failed to initialize pose detection:', err);
          if (mounted) {
            setError('Failed to initialize pose detection. Please refresh the page.');
            setIsLoading(false);
          }
        }
      };

      initializePoseDetection();

      // Cleanup on unmount
      return () => {
        mounted = false;
        stopCamera();
        if (poseLandmarkerRef.current) {
          poseLandmarkerRef.current.close();
        }
      };
    }, []); // Empty dependency array - only run on mount

    /**
     * Update pose landmarker configuration when confidence thresholds change.
     * Recreates the landmarker with new settings.
     */
    useEffect(() => {
      const updatePoseLandmarker = async () => {
        if (poseLandmarkerRef.current) {
          try {
            const vision = await FilesetResolver.forVisionTasks(
              'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );

            const newPoseLandmarker = await PoseLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
                delegate: 'GPU'
              },
              runningMode: 'VIDEO',
              numPoses: 1,
              minPoseDetectionConfidence: minHandDetectionConfidence,
              minPosePresenceConfidence: minHandPresenceConfidence,
              minTrackingConfidence: minTrackingConfidence
            });

            // Close old instance and replace with new one
            poseLandmarkerRef.current.close();
            poseLandmarkerRef.current = newPoseLandmarker;
          } catch (err) {
            console.error('Failed to update pose landmarker settings:', err);
          }
        }
      };

      updatePoseLandmarker();
    }, [minHandDetectionConfidence, minHandPresenceConfidence, minTrackingConfidence]);

    /**
     * Start camera stream and begin pose detection loop.
     * Requests webcam access and initializes video element.
     */
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            detectPose();  // Start detection loop
          };
        }
      } catch (err) {
        console.error('Failed to access camera:', err);
        setError('Camera access denied. Please allow camera permissions.');
      }
    };

    /**
     * Stop camera stream and cancel animation frame.
     * Cleanup function for unmounting or errors.
     */
    const stopCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    /**
     * Main detection loop that processes video frames.
     * Runs continuously using requestAnimationFrame for smooth updates.
     */
    const detectPose = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas || !poseLandmarkerRef.current) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Match canvas size to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Process current video frame
      const startTimeMs = performance.now();
      const results = poseLandmarkerRef.current.detectForVideo(video, startTimeMs);

      // Clear canvas and draw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Process detection results
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        // Draw pose skeleton on canvas
        drawPoseLandmarks(ctx, landmarks, canvas.width, canvas.height);
        
        // Analyze pose and detect gesture
        const detectedGesture = analyzeGesture(landmarks);
        
        // Only trigger callback if gesture changed
        if (detectedGesture !== lastGestureRef.current) {
          lastGestureRef.current = detectedGesture;
          
          // Calculate score based on gesture type
          const score = calculateScore(detectedGesture);
          
          // Calculate actual detection confidence from MediaPipe visibility scores
          const landmarkCount = results.landmarks[0].length;
          const visibilitySum = results.landmarks[0].reduce((sum, lm) => sum + (lm.visibility || 0), 0);
          const confidence = visibilitySum / landmarkCount;
          
          onGestureDetected({
            landmarks: results.landmarks.map(lm => 
              lm.map(point => ({
                x: point.x,
                y: point.y,
                z: point.z,
                visibility: point.visibility
              }))
            ),
            gesture: detectedGesture,
            confidence: confidence,
            score: score
          });
        }
      } else {
        // No pose detected
        if (lastGestureRef.current !== Gesture.NONE) {
          lastGestureRef.current = Gesture.NONE;
          onGestureDetected({
            landmarks: [],
            gesture: Gesture.NONE,
            confidence: 0,
            score: 0
          });
        }
      }

      // Continue detection loop
      animationFrameRef.current = requestAnimationFrame(detectPose);
    };

    /**
     * Draw pose skeleton and landmarks on canvas.
     * Visualizes detected body keypoints and connections.
     * 
     * @param ctx - Canvas 2D rendering context
     * @param landmarks - Array of pose landmarks from MediaPipe
     * @param width - Canvas width
     * @param height - Canvas height
     */
    const drawPoseLandmarks = (
      ctx: CanvasRenderingContext2D,
      landmarks: any[],
      width: number,
      height: number
    ) => {
      // Define pose connections (skeleton lines) using landmark indices
      const connections = [
        [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
        [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
        [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
        [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
        [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
        [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
        [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
        [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
        [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
        [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
        [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
        [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE]
      ];

      // Draw connection lines
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      connections.forEach(([start, end]) => {
        const startLandmark = landmarks[start];
        const endLandmark = landmarks[end];
        if (startLandmark && endLandmark) {
          ctx.beginPath();
          ctx.moveTo(startLandmark.x * width, startLandmark.y * height);
          ctx.lineTo(endLandmark.x * width, endLandmark.y * height);
          ctx.stroke();
        }
      });

      // Draw landmark points
      ctx.fillStyle = '#ff0000';
      landmarks.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(landmark.x * width, landmark.y * height, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    };

    /**
     * Analyze pose landmarks to identify the current gesture.
     * Implements detection logic for each supported gesture type.
     * 
     * @param landmarks - Array of pose landmarks from MediaPipe
     * @returns Detected gesture enum value
     */
    const analyzeGesture = (landmarks: any[]): Gesture => {
      // Extract key landmarks for analysis using named constants
      const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
      const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
      const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
      const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
      const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
      const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
      const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
      const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
      const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
      const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];

      // Check Elevate Left: left arm raised above shoulder
      if (leftWrist && leftShoulder && leftElbow) {
        const armAngle = calculateAngle(
          [leftShoulder.x, leftShoulder.y],
          [leftElbow.x, leftElbow.y],
          [leftWrist.x, leftWrist.y]
        );
        if (armAngle > THRESHOLDS.ARM_ANGLE_ELEVATED && leftWrist.y < leftShoulder.y) {
          return Gesture.ELEVATE_LEFT;
        }
      }

      // Check Elevate Right: right arm raised above shoulder
      if (rightWrist && rightShoulder && rightElbow) {
        const armAngle = calculateAngle(
          [rightShoulder.x, rightShoulder.y],
          [rightElbow.x, rightElbow.y],
          [rightWrist.x, rightWrist.y]
        );
        if (armAngle > THRESHOLDS.ARM_ANGLE_ELEVATED && rightWrist.y < rightShoulder.y) {
          return Gesture.ELEVATE_RIGHT;
        }
      }

      // Check T-Stop Left: left arm horizontal
      if (leftWrist && leftShoulder && leftElbow) {
        const armAngle = calculateAngle(
          [leftShoulder.x, leftShoulder.y],
          [leftElbow.x, leftElbow.y],
          [leftWrist.x, leftWrist.y]
        );
        const yDiff = Math.abs(leftWrist.y - leftShoulder.y);
        if (armAngle > THRESHOLDS.ARM_ANGLE_HORIZONTAL && yDiff < THRESHOLDS.Y_ALIGNMENT_TOLERANCE) {
          return Gesture.T_STOP_LEFT;
        }
      }

      // Check T-Stop Right: right arm horizontal
      if (rightWrist && rightShoulder && rightElbow) {
        const armAngle = calculateAngle(
          [rightShoulder.x, rightShoulder.y],
          [rightElbow.x, rightElbow.y],
          [rightWrist.x, rightWrist.y]
        );
        const yDiff = Math.abs(rightWrist.y - rightShoulder.y);
        if (armAngle > THRESHOLDS.ARM_ANGLE_HORIZONTAL && yDiff < THRESHOLDS.Y_ALIGNMENT_TOLERANCE) {
          return Gesture.T_STOP_RIGHT;
        }
      }

      // Check Wave Left: left arm at 50-130 degrees
      if (leftWrist && leftShoulder && leftElbow) {
        const armAngle = calculateAngle(
          [leftShoulder.x, leftShoulder.y],
          [leftElbow.x, leftElbow.y],
          [leftWrist.x, leftWrist.y]
        );
        if (armAngle > THRESHOLDS.ARM_ANGLE_WAVE_MIN && armAngle < THRESHOLDS.ARM_ANGLE_WAVE_MAX && leftWrist.y < leftShoulder.y) {
          return Gesture.WAVE_LEFT;
        }
      }

      // Check Wave Right: right arm at 50-130 degrees
      if (rightWrist && rightShoulder && rightElbow) {
        const armAngle = calculateAngle(
          [rightShoulder.x, rightShoulder.y],
          [rightElbow.x, rightElbow.y],
          [rightWrist.x, rightWrist.y]
        );
        if (armAngle > THRESHOLDS.ARM_ANGLE_WAVE_MIN && armAngle < THRESHOLDS.ARM_ANGLE_WAVE_MAX && rightWrist.y < rightShoulder.y) {
          return Gesture.WAVE_RIGHT;
        }
      }

      // Check Rotation: shoulders closer together (torso rotation)
      if (leftShoulder && rightShoulder) {
        const shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
        if (shoulderDistance < THRESHOLDS.SHOULDER_ROTATION) {
          return Gesture.ROTATION;
        }
      }

      // Check March Left: left knee raised
      if (leftHip && leftKnee) {
        const kneeRaised = leftKnee.y < leftHip.y - THRESHOLDS.KNEE_RAISE_THRESHOLD;
        if (kneeRaised) {
          return Gesture.MARCH_LEFT;
        }
      }

      // Check March Right: right knee raised
      if (rightHip && rightKnee) {
        const kneeRaised = rightKnee.y < rightHip.y - THRESHOLDS.KNEE_RAISE_THRESHOLD;
        if (kneeRaised) {
          return Gesture.MARCH_RIGHT;
        }
      }

      // No gesture detected
      return Gesture.NONE;
    };

    /**
     * Calculate angle between three points in 2D space.
     * Used for determining joint angles in pose analysis.
     * 
     * @param a - First point [x, y]
     * @param b - Middle point (vertex) [x, y]
     * @param c - Third point [x, y]
     * @returns Angle in degrees (0-180)
     */
    const calculateAngle = (
      a: [number, number],
      b: [number, number],
      c: [number, number]
    ): number => {
      const radians = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(a[1] - b[1], a[0] - b[0]);
      let angle = Math.abs(radians * (180 / Math.PI));
      if (angle > 180) {
        angle = 360 - angle;
      }
      return angle;
    };

    /**
     * Calculate score points for a detected gesture.
     * Different gestures award different point values.
     * 
     * @param gesture - The detected gesture
     * @returns Score points (10-30 based on gesture complexity)
     */
    const calculateScore = (gesture: Gesture): number => {
      switch (gesture) {
        case Gesture.ELEVATE_LEFT:
        case Gesture.ELEVATE_RIGHT:
          return 15;
        case Gesture.T_STOP_LEFT:
        case Gesture.T_STOP_RIGHT:
          return 20;
        case Gesture.WAVE_LEFT:
        case Gesture.WAVE_RIGHT:
          return 10;
        case Gesture.ROTATION:
          return 25;
        case Gesture.MARCH_LEFT:
        case Gesture.MARCH_RIGHT:
          return 15;
        default:
          return 0;
      }
    };

    // Render loading, error, or canvas
    if (isLoading) {
      return (
        <div className="flex items-center justify-center w-full h-96 bg-slate-800 rounded-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading pose detection...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center w-full h-96 bg-slate-800 rounded-2xl">
          <div className="text-center text-red-400">
            <p>{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full max-w-4xl">
        {/* Hidden video element for camera feed */}
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          muted
        />
        
        {/* Canvas for rendering video and pose overlay */}
        <canvas
          ref={canvasRef}
          className="w-full rounded-2xl shadow-2xl border-2 border-slate-700"
        />
        
        {/* Target gesture indicator (when hovering over gesture cards) */}
        {targetGesture && targetGesture !== Gesture.NONE && (
          <div className="absolute top-4 right-4 bg-slate-900/90 px-4 py-2 rounded-lg border border-indigo-500">
            <p className="text-sm text-indigo-300">Target: {targetGesture}</p>
          </div>
        )}
      </div>
    );
  }
);

GestureCanvas.displayName = 'GestureCanvas';

export default GestureCanvas;
