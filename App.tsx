import React, { useState } from 'react';
import { FileVideo, FileAudio, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { MediaComparator } from './components/MediaComparator';

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleStart = () => {
    if (videoFile && audioFile) {
      setIsReady(true);
    }
  };

  const handleReset = () => {
    setIsReady(false);
    setVideoFile(null);
    setAudioFile(null);
  };

  if (isReady && videoFile && audioFile) {
    return (
      <MediaComparator 
        videoFile={videoFile} 
        audioFile={audioFile}
        onReset={handleReset} 
      />
    );
  }

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header Section */}
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">SyncPro Audio Analyzer</h1>
          </div>
          <p className="text-slate-400 max-w-lg">
            Upload source materials to begin forensic analysis. Sync video proof with isolated audio tracks for simultaneous comparison and amplitude verification.
          </p>
        </div>

        {/* Upload Section */}
        <div className="p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Original Video Source</label>
                {videoFile && <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">Ready</span>}
              </div>
              <FileUpload 
                label="Upload Video Proof" 
                accept="video/*"
                file={videoFile}
                onFileSelect={setVideoFile}
                icon={<FileVideo size={24} />}
              />
              <p className="text-xs text-slate-400">Supported formats: MP4, WEBM, MOV</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Isolated Audio Track</label>
                {audioFile && <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">Ready</span>}
              </div>
              <FileUpload 
                label="Upload Isolated Audio" 
                accept="audio/*"
                file={audioFile}
                onFileSelect={setAudioFile}
                icon={<FileAudio size={24} />}
              />
              <p className="text-xs text-slate-400">Supported formats: MP3, WAV, AAC</p>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-100">
            <button
              onClick={handleStart}
              disabled={!videoFile || !audioFile}
              className={`
                flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-200
                ${videoFile && audioFile 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 translate-y-0' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
              `}
            >
              Start Analysis <ArrowRight size={16} />
            </button>
          </div>
        </div>
        
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Local processing only. Your files are not uploaded to any server.</span>
        </div>
      </div>
    </div>
  );
}