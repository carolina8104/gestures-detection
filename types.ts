export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export enum Gesture {
  ELEVATE_LEFT = 'Elevate Left',
  ELEVATE_RIGHT = 'Elevate Right',
  T_STOP_LEFT = 'T-Stop Left',
  T_STOP_RIGHT = 'T-Stop Right',
  WAVE_LEFT = 'Wave Left',
  WAVE_RIGHT = 'Wave Right',
  ROTATION = 'Shoulder Rotation',
  SQUAT = 'Squat',
  MARCH_LEFT = 'March Left',
  MARCH_RIGHT = 'March Right',
  STEP_FORWARD = 'Step Forward',
  UNKNOWN = 'Desconhecido',
  NONE = 'Nenhuma Pose Detetada'
}

export interface DetectionResult {
  landmarks: Landmark[][];
  gesture: Gesture;
  confidence: number;
  score: number; // pontuação para o gesto executado
}