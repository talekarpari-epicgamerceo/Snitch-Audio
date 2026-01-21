import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, Link2, Link2Off } from 'lucide-react';
import { WaveformGraph } from './WaveformGraph';
import { AnalysisPanel } from './AnalysisPanel';
import { AnalysisState } from '../types';
import { decodeAudioFile, extractAudioPeaks, formatTime, audioBufferToWav, blobToBase64 } from '../utils/audioUtils';
import { GoogleGenAI } from "@google/genai";

interface MediaComparatorProps {
  videoFile: File;
  audioFile: File;
  onReset: () => void;
}

export const MediaComparator: React.FC<MediaComparatorProps> = ({ videoFile, audioFile, onReset }) => {
  // Media State
  const [isSynced, setIsSynced] = useState(true);
  const [isPlaying1, setIsPlaying1] = useState(false);
  const [isPlaying2, setIsPlaying2] = useState(false);
  
  const [currentTime1, setCurrentTime1] = useState(0);
  const [currentTime2, setCurrentTime2] = useState(0);
  const [duration, setDuration] = useState(0);

  // Analysis Data State
  const [analysis, setAnalysis] = useState<AnalysisState>({
    isProcessing: true,
    data: [],
    duration: 0
  });

  // AI Report State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Refs for media elements
  const videoOriginalRef = useRef<HTMLVideoElement>(null);
  const videoMutedRef = useRef<HTMLVideoElement>(null);
  const audioIsolatedRef = useRef<HTMLAudioElement>(null);
  
  // Refs for URLs to cleanup
  const videoUrlRef = useRef<string>('');
  const audioUrlRef = useRef<string>('');
  const animationFrameRef = useRef<number>();

  // Initialize Media & Analysis
  useEffect(() => {
    videoUrlRef.current = URL.createObjectURL(videoFile);
    audioUrlRef.current = URL.createObjectURL(audioFile);

    if (videoOriginalRef.current) videoOriginalRef.current.src = videoUrlRef.current;
    if (videoMutedRef.current) videoMutedRef.current.src = videoUrlRef.current;
    if (audioIsolatedRef.current) audioIsolatedRef.current.src = audioUrlRef.current;

    const processFiles = async () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Decode both files
        const [originalBuffer, isolatedBuffer] = await Promise.all([
          decodeAudioFile(videoFile, audioCtx),
          decodeAudioFile(audioFile, audioCtx)
        ]);
        
        // 1. Setup Graph Data
        const maxDuration = Math.max(originalBuffer.duration, isolatedBuffer.duration);
        setDuration(maxDuration);

        const { points, originalPeakRegion, isolatedPeakRegion } = extractAudioPeaks(originalBuffer, isolatedBuffer, 500);
        
        setAnalysis({
          isProcessing: false,
          data: points,
          duration: maxDuration,
          originalPeakRegion,
          isolatedPeakRegion
        });
        
        // 2. Trigger AI Analysis (Pre-loading)
        generateAiReport(originalBuffer);

        // Cleanup context
        audioCtx.close();
      } catch (err) {
        console.error("Error processing media", err);
        setAnalysis(prev => ({ ...prev, isProcessing: false, error: "Failed to analyze audio data" }));
      }
    };

    processFiles();

    return () => {
      URL.revokeObjectURL(videoUrlRef.current);
      URL.revokeObjectURL(audioUrlRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [videoFile, audioFile]);

  const generateAiReport = async (buffer: AudioBuffer) => {
    if (!process.env.API_KEY) {
      setAiError("API Key missing");
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      // Create a snippet (max 30s) for analysis to keep it fast
      const copyDuration = Math.min(30, buffer.duration);
      const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.sampleRate * copyDuration, buffer.sampleRate);
      const copyLength = Math.floor(copyDuration * buffer.sampleRate);
      
      const snippetBuffer = ctx.createBuffer(buffer.numberOfChannels, copyLength, buffer.sampleRate);
      
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const nowBuffering = snippetBuffer.getChannelData(channel);
        const sourceData = buffer.getChannelData(channel);
        for (let i = 0; i < copyLength; i++) {
          nowBuffering[i] = sourceData[i];
        }
      }

      const wavBlob = audioBufferToWav(snippetBuffer);
      const base64Audio = await blobToBase64(wavBlob);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Listen to this audio clip from a video scene. 
        Provide a forensic audio analysis report:
        1. Music Detection: Is music playing? Genre/Mood?
        2. Source: Diegetic (in-scene) or Non-diegetic?
        3. Noise Analysis: List specific unwanted noises (traffic, wind, speech).
        4. Verdict: Is the song clearly audible?
        
        Format as concise short paragraphs.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
            { text: prompt }
          ]
        }
      });

      setAiReport(response.text || "No analysis available.");

    } catch (err: any) {
      console.error("AI Analysis failed:", err);
      setAiError("Analysis failed: " + (err.message || "Unknown error"));
    } finally {
      setAiLoading(false);
    }
  };

  // Sync Loop
  const syncLoop = useCallback(() => {
    const v1 = videoOriginalRef.current;
    const v2 = videoMutedRef.current;
    const a1 = audioIsolatedRef.current;

    if (!v1 || !v2 || !a1) return;

    setCurrentTime1(v1.currentTime);
    setCurrentTime2(v2.currentTime);

    // Drift Correction if Linked
    if (isSynced && !v1.paused) {
      const tolerance = 0.15;
      if (Math.abs(v2.currentTime - v1.currentTime) > tolerance) v2.currentTime = v1.currentTime;
      if (Math.abs(a1.currentTime - v1.currentTime) > tolerance) a1.currentTime = v1.currentTime;
    }

    if (!v1.paused || !v2.paused || !a1.paused) {
       animationFrameRef.current = requestAnimationFrame(syncLoop);
    }
  }, [isSynced]);

  // Restart loop on play state change
  useEffect(() => {
     if (isPlaying1 || isPlaying2) {
       animationFrameRef.current = requestAnimationFrame(syncLoop);
     }
  }, [isPlaying1, isPlaying2, syncLoop]);

  const handleGlobalPlayPause = () => {
    const v1 = videoOriginalRef.current;
    const v2 = videoMutedRef.current;
    const a1 = audioIsolatedRef.current;
    if (!v1 || !v2 || !a1) return;

    if (isPlaying1) {
      v1.pause();
      v2.pause();
      a1.pause();
      setIsPlaying1(false);
      setIsPlaying2(false);
    } else {
      if (isSynced) {
         v2.currentTime = v1.currentTime;
         a1.currentTime = v1.currentTime;
      }
      v1.play();
      v2.play();
      a1.play();
      setIsPlaying1(true);
      setIsPlaying2(true);
    }
  };

  const handleToggle1 = () => {
    const v1 = videoOriginalRef.current;
    if (!v1) return;
    
    if (v1.paused) {
      v1.play();
      setIsPlaying1(true);
      if (isSynced) {
         videoMutedRef.current?.play();
         audioIsolatedRef.current?.play();
         setIsPlaying2(true);
      }
    } else {
      v1.pause();
      setIsPlaying1(false);
      if (isSynced) {
        videoMutedRef.current?.pause();
        audioIsolatedRef.current?.pause();
        setIsPlaying2(false);
      }
    }
  };

  const handleToggle2 = () => {
    const v2 = videoMutedRef.current;
    const a1 = audioIsolatedRef.current;
    if (!v2 || !a1) return;

    if (v2.paused) {
      v2.play();
      a1.play();
      setIsPlaying2(true);
      if (isSynced) {
         videoOriginalRef.current?.play();
         setIsPlaying1(true);
      }
    } else {
      v2.pause();
      a1.pause();
      setIsPlaying2(false);
      if (isSynced) {
        videoOriginalRef.current?.pause();
        setIsPlaying1(false);
      }
    }
  };

  const handleSeek = (time: number) => {
    const v1 = videoOriginalRef.current;
    const v2 = videoMutedRef.current;
    const a1 = audioIsolatedRef.current;

    if (v1) {
      v1.currentTime = time;
      setCurrentTime1(time);
    }

    if (isSynced && v2 && a1) {
      v2.currentTime = time;
      a1.currentTime = time;
      setCurrentTime2(time);
    } else if (!isSynced && v2 && a1) {
      v2.currentTime = time;
      a1.currentTime = time;
      setCurrentTime2(time);
    }
  };
  
  const handleSeekRange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSeek(Number(e.target.value));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shrink-0 shadow-sm z-20 h-14">
        <div className="flex items-center gap-4">
          <button 
            onClick={onReset}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Upload new files"
          >
            <RotateCcw size={18} />
          </button>
          
          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <button
             onClick={() => setIsSynced(!isSynced)}
             className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all
               ${isSynced 
                 ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                 : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            {isSynced ? <Link2 size={14} /> : <Link2Off size={14} />}
            {isSynced ? 'Linked' : 'Unlinked'}
          </button>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={handleGlobalPlayPause}
             className="flex items-center gap-2 px-6 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium text-sm transition-colors shadow-sm"
           >
             {isPlaying1 && isPlaying2 ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
             {isPlaying1 && isPlaying2 ? "Pause" : "Play"}
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-h-0">
        
        {/* Videos Area (50%) */}
        <div className="h-1/2 min-h-[300px] shrink-0 grid grid-cols-2 gap-1 bg-black/5 p-1">
          {/* Player 1 */}
          <div className={`relative bg-black rounded-lg overflow-hidden group border-2 ${isPlaying1 ? 'border-blue-500' : 'border-transparent'}`}>
            <video 
              ref={videoOriginalRef}
              className="w-full h-full object-contain"
              onEnded={() => setIsPlaying1(false)}
              onClick={handleToggle1}
            />
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs font-medium text-white flex items-center gap-2 pointer-events-none">
               <div className="w-2 h-2 rounded-full bg-blue-500"></div> Original
            </div>
          </div>

          {/* Player 2 */}
          <div className={`relative bg-black rounded-lg overflow-hidden group border-2 ${isPlaying2 ? 'border-emerald-500' : 'border-transparent'}`}>
            <video 
              ref={videoMutedRef}
              className="w-full h-full object-contain"
              muted
              onClick={handleToggle2}
            />
            <audio ref={audioIsolatedRef} className="hidden" onEnded={() => setIsPlaying2(false)} />
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs font-medium text-white flex items-center gap-2 pointer-events-none">
               <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Isolated Sync
            </div>
          </div>
        </div>

        {/* Bottom Panel (Remaining) */}
        <div className="flex-1 min-h-0 flex flex-col bg-white border-t border-slate-200">
          
          {/* Scrubber */}
          <div className="h-6 w-full relative group cursor-pointer bg-slate-50 shrink-0 border-b border-slate-100">
            <div className="absolute w-full h-full flex items-center px-0">
               <div className="w-full h-full bg-slate-100 relative overflow-hidden">
                 <div className="absolute top-0 bottom-0 bg-blue-500/30" style={{ width: `${(currentTime1 / duration) * 100}%` }} />
                 {!isSynced && (
                   <div className="absolute top-0 bottom-0 bg-emerald-500/30" style={{ width: `${(currentTime2 / duration) * 100}%` }} />
                 )}
               </div>
            </div>
             <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                step={0.01}
                value={currentTime1}
                onChange={handleSeekRange}
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
              />
          </div>

          {/* Analysis & Graph */}
          <div className="flex-1 min-h-0 flex overflow-hidden p-3 gap-3">
            
            {/* Waveform (Left) */}
            <div className="flex-[3] min-w-0 h-full">
              <WaveformGraph 
                data={analysis.data} 
                currentTime1={currentTime1}
                currentTime2={currentTime2}
                duration={analysis.duration}
                onSeek={handleSeek}
                originalPeakRegion={analysis.originalPeakRegion}
                isolatedPeakRegion={analysis.isolatedPeakRegion}
              />
            </div>

            {/* AI Panel (Right) */}
            <div className="flex-1 min-w-[320px] max-w-md h-full">
              <AnalysisPanel 
                report={aiReport}
                isLoading={aiLoading}
                error={aiError}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};