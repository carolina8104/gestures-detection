import React, { useState, useMemo, useRef } from 'react';
import GestureCanvas, { GestureCanvasRef } from './components/GestureCanvas';
import { DetectionResult, Gesture } from './types';
import { Activity, Settings, Sliders, User, Download, Code, ChevronDown, ChevronUp, RefreshCcw } from 'lucide-react';
import { generatePythonCode } from './services/gestureService';

/**
 * Main application component for gesture detection system.
 * Manages the camera feed, gesture detection, UI state, and user interactions.
 */
const App: React.FC = () => {
  // Gesture state management
  const [currentGesture, setCurrentGesture] = useState<Gesture>(Gesture.NONE);
  const [hoveredGesture, setHoveredGesture] = useState<Gesture | null>(null);
  const gestureCanvasRef = useRef<GestureCanvasRef>(null);
  
  // MediaPipe confidence thresholds for pose detection
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0.5);
  const [presenceConfidence, setPresenceConfidence] = useState<number>(0.5);
  const [trackingConfidence, setTrackingConfidence] = useState<number>(0.5);
  
  // UI visibility toggles
  const [showSettings, setShowSettings] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);

  // Score tracking: accumulates points as gestures are performed
  const [totalScore, setTotalScore] = useState<number>(0);
  const [currentScore, setCurrentScore] = useState<number>(0);

  /**
   * Callback handler when a gesture is detected by the GestureCanvas component.
   * Updates the current gesture state and accumulates score.
   * 
   * @param result - Detection result containing gesture type and score
   */
  const handleGestureDetected = (result: DetectionResult) => {
    setCurrentGesture(result.gesture);
    setCurrentScore(result.score);
    // Accumulate score to running total
    setTotalScore(prev => prev + result.score);
  };

  /**
   * Maps each gesture type to its corresponding color theme for UI consistency.
   * Returns Tailwind CSS classes for text and border colors.
   * 
   * @param gesture - The gesture type to get colors for
   * @returns CSS classes string for text and border styling
   */
  const getGestureColor = (gesture: Gesture) => {
    switch (gesture) {
      case Gesture.ELEVATE_LEFT: 
      case Gesture.ELEVATE_RIGHT:
        return 'text-purple-400 border-purple-400';
      case Gesture.T_STOP_LEFT:
      case Gesture.T_STOP_RIGHT:
        return 'text-red-400 border-red-400';
      case Gesture.WAVE_LEFT:
      case Gesture.WAVE_RIGHT:
        return 'text-yellow-400 border-yellow-400';
      case Gesture.ROTATION: 
        return 'text-cyan-400 border-cyan-400';
      case Gesture.MARCH_LEFT:
      case Gesture.MARCH_RIGHT:
        return 'text-green-400 border-green-400';
      default: 
        return 'text-slate-400 border-slate-600';
    }
  };

  // Memoize the current gesture color to avoid recalculation on every render
  const currentGestureColor = useMemo(() => getGestureColor(currentGesture), [currentGesture]);

  /**
   * Handles downloading Python detection code for a specific gesture.
   * Generates the code, creates a downloadable file, and triggers browser download.
   * 
   * @param gesture - The gesture to generate Python code for
   */
  const handleDownloadCode = (gesture: Gesture) => {
    const code = generatePythonCode(gesture);
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gesture.toLowerCase().replace(/ /g, '_')}_detection.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Manually resets the tracking system and clears all scores.
   * Useful when the detection gets stuck or user wants to start fresh.
   */
  const handleManualReset = () => {
    if (gestureCanvasRef.current) {
      gestureCanvasRef.current.resetTracking();
      setCurrentGesture(Gesture.NONE);
      setTotalScore(0);
      setCurrentScore(0);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header: Contains branding, model info, and control buttons */}
      <header className="p-6 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 flex items-center gap-2">
                Reconhecimento de Pose 
                <span className="text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                  Lite Model
                </span>
              </h1>
              <p className="text-xs text-slate-400">MediaPipe pose_landmarker_lite (Float16)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {/* Manual reset button to restart tracking */}
             <button 
               onClick={handleManualReset}
               className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
               title="Reiniciar Rastreamento"
             >
               <RefreshCcw className="w-5 h-5" />
             </button>
             {/* Settings toggle button */}
             <button 
               onClick={() => setShowSettings(!showSettings)}
               className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
               title="Definições"
             >
               <Settings className="w-5 h-5" />
             </button>
             {/* Camera active indicator */}
             <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span>Câmara Ativa</span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-start p-4 sm:p-8 gap-8">
        
        {/* Status Bar: Shows currently detected gesture and score */}
        <div className={`
          flex items-center gap-4 px-8 py-4 rounded-2xl border-2 transition-all duration-300 transform
          ${currentGesture !== Gesture.NONE ? 'bg-slate-800/80 scale-105 shadow-xl' : 'bg-slate-900/50 border-transparent'}
          ${currentGestureColor}
        `}>
          <Activity className="w-6 h-6" />
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Pose Atual</span>
            <span className="text-2xl font-bold tracking-tight">
              {currentGesture === Gesture.NONE ? "A aguardar pose..." : currentGesture}
            </span>
            {/* Display current gesture score and total accumulated score */}
            {currentGesture !== Gesture.NONE && (
              <span className="text-sm text-indigo-300">Pontuação: +{Math.round(currentScore)} | Total: {totalScore}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl justify-center items-start">
          
          {/* Settings Panel: MediaPipe confidence threshold controls */}
          {showSettings && (
             <div className="w-full lg:w-64 flex-shrink-0 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 animate-in slide-in-from-top-5 duration-200">
                <div className="flex items-center gap-2 mb-4 text-indigo-400">
                  <Sliders className="w-5 h-5" />
                  <h2 className="font-semibold">Sensibilidade</h2>
                </div>
                
                <div className="space-y-6">
                  <RangeControl 
                    label="Confiança de Deteção" 
                    value={detectionConfidence} 
                    onChange={setDetectionConfidence}
                    tooltip="Pontuação mínima de confiança para a deteção da pose ser considerada bem-sucedida."
                  />
                  <RangeControl 
                    label="Confiança de Presença" 
                    value={presenceConfidence} 
                    onChange={setPresenceConfidence}
                    tooltip="Pontuação mínima de confiança para a presença da pose."
                  />
                  <RangeControl 
                    label="Confiança de Rastreamento" 
                    value={trackingConfidence} 
                    onChange={setTrackingConfidence}
                    tooltip="Pontuação mínima de confiança para o rastreamento ser considerado bem-sucedido."
                  />
                </div>
             </div>
          )}

          {/* Video Canvas Container: Main area for camera feed and pose detection */}
          <div className="flex-grow flex flex-col items-center w-full">
            <GestureCanvas 
              ref={gestureCanvasRef}
              onGestureDetected={handleGestureDetected} 
              targetGesture={hoveredGesture}
              minHandDetectionConfidence={detectionConfidence}
              minHandPresenceConfidence={presenceConfidence}
              minTrackingConfidence={trackingConfidence}
            />
          </div>

        </div>

        {/* Info Cards / Instructions - Display all available gestures */}
        <div className="max-w-6xl w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GestureCard 
            title="Elevate Left" 
            desc="Braço esquerdo cima > 150°. Pulso > Ombro." 
            active={currentGesture === Gesture.ELEVATE_LEFT} 
            color="bg-purple-500/20 border-purple-500/50 text-purple-300"
            onMouseEnter={() => setHoveredGesture(Gesture.ELEVATE_LEFT)}
            onMouseLeave={() => setHoveredGesture(null)}
          />
          <GestureCard 
            title="Elevate Right" 
            desc="Braço direito cima > 150°. Pulso > Ombro." 
            active={currentGesture === Gesture.ELEVATE_RIGHT} 
            color="bg-purple-500/20 border-purple-500/50 text-purple-300"
            onMouseEnter={() => setHoveredGesture(Gesture.ELEVATE_RIGHT)}
            onMouseLeave={() => setHoveredGesture(null)}
          />
          <GestureCard 
            title="T-Stop Left" 
            desc="Braço esq. horizontal. Pulso alinhado." 
            active={currentGesture === Gesture.T_STOP_LEFT} 
            color="bg-red-500/20 border-red-500/50 text-red-300"
            onMouseEnter={() => setHoveredGesture(Gesture.T_STOP_LEFT)}
            onMouseLeave={() => setHoveredGesture(null)}
          />
           <GestureCard 
            title="T-Stop Right" 
            desc="Braço dir. horizontal. Pulso alinhado." 
            active={currentGesture === Gesture.T_STOP_RIGHT} 
            color="bg-red-500/20 border-red-500/50 text-red-300"
            onMouseEnter={() => setHoveredGesture(Gesture.T_STOP_RIGHT)}
            onMouseLeave={() => setHoveredGesture(null)}
          />
          <GestureCard 
            title="Wave Left" 
            desc="Braço esq. 50-130°. Pulso cima." 
            active={currentGesture === Gesture.WAVE_LEFT} 
            color="bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
            onMouseEnter={() => setHoveredGesture(Gesture.WAVE_LEFT)}
            onMouseLeave={() => setHoveredGesture(null)}
          />
          <GestureCard 
            title="Wave Right" 
            desc="Braço dir. 50-130°. Pulso cima." 
            active={currentGesture === Gesture.WAVE_RIGHT} 
            color="bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
            onMouseEnter={() => setHoveredGesture(Gesture.WAVE_RIGHT)}
            onMouseLeave={() => setHoveredGesture(null)}
          />
          <GestureCard 
            title="Torso Rotation" 
            desc="Rodar tronco (ombros aproximam)." 
            active={currentGesture === Gesture.ROTATION} 
            color="bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
            onMouseEnter={() => setHoveredGesture(Gesture.ROTATION)}
            onMouseLeave={() => setHoveredGesture(null)}
          />
          <GestureCard 
            title="March Left" 
            desc="Eleve o joelho esquerdo > 20°. Simula marcha." 
            active={currentGesture === Gesture.MARCH_LEFT} 
            color="bg-green-500/20 border-green-500/50 text-green-300"
            onMouseEnter={() => setHoveredGesture(Gesture.MARCH_LEFT)}
            onMouseLeave={() => setHoveredGesture(null)}
          />
          <GestureCard 
            title="March Right" 
            desc="Eleve o joelho direito > 20°. Simula marcha." 
            active={currentGesture === Gesture.MARCH_RIGHT} 
            color="bg-green-500/20 border-green-500/50 text-green-300"
            onMouseEnter={() => setHoveredGesture(Gesture.MARCH_RIGHT)}
            onMouseLeave={() => setHoveredGesture(null)}
          />
        </div>

        {/* Download Section - Collapsible panel for Python code downloads */}
        <div className="max-w-6xl w-full mt-8 bg-slate-800/40 rounded-2xl border border-slate-700/50 overflow-hidden transition-all duration-300">
          <button 
            onClick={() => setShowDownloads(!showDownloads)}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Code className="w-6 h-6 text-indigo-400" />
              <h2 className="text-xl font-bold text-white">Python</h2>
            </div>
            {showDownloads ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
          
          {/* Python code download buttons for each gesture */}
          {showDownloads && (
            <div className="p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
              <DownloadButton 
                label="Elevate Left (.py)" 
                onClick={() => handleDownloadCode(Gesture.ELEVATE_LEFT)} 
                color="hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-300"
              />
              <DownloadButton 
                label="Elevate Right (.py)" 
                onClick={() => handleDownloadCode(Gesture.ELEVATE_RIGHT)} 
                color="hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-300"
              />
               <DownloadButton 
                label="T-Stop Left (.py)" 
                onClick={() => handleDownloadCode(Gesture.T_STOP_LEFT)} 
                color="hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300"
              />
              <DownloadButton 
                label="T-Stop Right (.py)" 
                onClick={() => handleDownloadCode(Gesture.T_STOP_RIGHT)} 
                color="hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300"
              />
              <DownloadButton 
                label="Wave Left (.py)" 
                onClick={() => handleDownloadCode(Gesture.WAVE_LEFT)} 
                color="hover:bg-yellow-500/20 hover:border-yellow-500/50 hover:text-yellow-300"
              />
               <DownloadButton 
                label="Wave Right (.py)" 
                onClick={() => handleDownloadCode(Gesture.WAVE_RIGHT)} 
                color="hover:bg-yellow-500/20 hover:border-yellow-500/50 hover:text-yellow-300"
              />
              <DownloadButton 
                label="Rotation (.py)" 
                onClick={() => handleDownloadCode(Gesture.ROTATION)} 
                color="hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-300"
              />
              <DownloadButton 
                label="March Left (.py)" 
                onClick={() => handleDownloadCode(Gesture.MARCH_LEFT)} 
                color="hover:bg-green-500/20 hover:border-green-500/50 hover:text-green-300"
              />
              <DownloadButton 
                label="March Right (.py)" 
                onClick={() => handleDownloadCode(Gesture.MARCH_RIGHT)} 
                color="hover:bg-green-500/20 hover:border-green-500/50 hover:text-green-300"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

/**
 * Props interface for the GestureCard component.
 * Defines the structure of props passed to individual gesture cards.
 */
interface GestureCardProps {
  title: string;                   // Display name of the gesture
  desc: string;                    // Description of how to perform the gesture
  active: boolean;                 // Whether this gesture is currently being performed
  color: string;                   // Tailwind CSS classes for colors
  onMouseEnter?: () => void;      // Callback when mouse hovers over card
  onMouseLeave?: () => void;      // Callback when mouse leaves card
}

/**
 * GestureCard component displays information about a single gesture.
 * Shows the gesture name, description, and highlights when active.
 * Hovering over a card can trigger visual feedback in the canvas.
 * 
 * @param props - GestureCardProps containing card configuration
 */
const GestureCard = ({ title, desc, active, color, onMouseEnter, onMouseLeave }: GestureCardProps) => (
  <div 
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className={`
      p-4 rounded-xl border transition-all duration-300 flex flex-col justify-center min-h-[100px] cursor-help
      ${active ? `${color} shadow-lg scale-105` : 'bg-slate-800/40 border-slate-700/50 text-slate-500 hover:bg-slate-800/80 hover:border-slate-600'}
    `}
  >
    <h3 className="font-bold text-lg mb-1">{title}</h3>
    <p className="text-xs opacity-80 leading-tight">{desc}</p>
  </div>
);

/**
 * DownloadButton component for downloading Python detection code.
 * Provides a clickable button that generates and downloads gesture-specific Python code.
 * 
 * @param label - Button text label
 * @param onClick - Handler function triggered on click
 * @param color - Tailwind CSS classes for hover color effects
 */
const DownloadButton = ({ label, onClick, color }: { label: string, onClick: () => void, color: string }) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-700 bg-slate-900/50 
      text-slate-400 font-medium transition-all duration-200 ${color} group
    `}
  >
    <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
    <span>{label}</span>
  </button>
);

/**
 * RangeControl component for adjusting MediaPipe confidence thresholds.
 * Displays a labeled slider with current value and tooltip explanation.
 * 
 * @param label - Display label for the control
 * @param value - Current numeric value (0.0-1.0)
 * @param onChange - Callback function when value changes
 * @param tooltip - Explanatory text shown on hover
 */
const RangeControl = ({ label, value, onChange, tooltip }: { label: string, value: number, onChange: (v: number) => void, tooltip: string }) => (
  <div className="flex flex-col gap-2 group">
    <div className="flex justify-between items-center">
      <label className="text-xs font-medium text-slate-300" title={tooltip}>{label}</label>
      <span className="text-xs text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">{value.toFixed(2)}</span>
    </div>
    <input 
      type="range" 
      min="0.1" 
      max="1.0" 
      step="0.05" 
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
    />
  </div>
);

export default App;