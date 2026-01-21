export interface AudioDataPoint {
  time: number;
  original: number;
  isolated: number;
}

export interface PeakRegion {
  start: number;
  end: number;
  amplitude: number;
}

export interface AnalysisState {
  isProcessing: boolean;
  data: AudioDataPoint[];
  duration: number;
  originalPeakRegion?: PeakRegion;
  isolatedPeakRegion?: PeakRegion;
  error?: string;
}

export interface AIReport {
  musicType: string;
  source: string;
  noiseDetected: string[];
  summary: string;
}

export enum PlayerStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
}