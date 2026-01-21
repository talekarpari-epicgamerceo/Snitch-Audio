import { AudioDataPoint, PeakRegion } from '../types';

export const decodeAudioFile = async (file: File, context: AudioContext): Promise<AudioBuffer> => {
  const arrayBuffer = await file.arrayBuffer();
  return await context.decodeAudioData(arrayBuffer);
};

export const extractAudioPeaks = (
  buffer1: AudioBuffer | null,
  buffer2: AudioBuffer | null,
  samples: number = 200
): { 
  points: AudioDataPoint[], 
  originalPeakRegion: PeakRegion | undefined,
  isolatedPeakRegion: PeakRegion | undefined
} => {
  const duration = Math.max(buffer1?.duration || 0, buffer2?.duration || 0);
  if (duration === 0) return { points: [], originalPeakRegion: undefined, isolatedPeakRegion: undefined };

  const data: AudioDataPoint[] = [];
  const step = duration / samples;

  // Helper to get peak in a window
  const getPeak = (buffer: AudioBuffer, startTime: number, windowSize: number) => {
    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor((startTime + windowSize) * sampleRate);
    const channelData = buffer.getChannelData(0); // Use first channel (mono/left)
    
    let max = 0;
    // Optimization: Don't check every single sample if window is huge, stride it
    const stride = Math.ceil((endSample - startSample) / 1000) || 1;
    
    for (let i = startSample; i < endSample && i < channelData.length; i += stride) {
      const val = Math.abs(channelData[i]);
      if (val > max) max = val;
    }
    return max;
  };

  let maxOriginalAmplitude = 0;
  let maxOriginalTime = 0;

  let maxIsolatedAmplitude = 0;
  let maxIsolatedTime = 0;

  for (let i = 0; i < samples; i++) {
    const time = i * step;
    const original = buffer1 ? getPeak(buffer1, time, step) : 0;
    const isolated = buffer2 ? getPeak(buffer2, time, step) : 0;
    
    // Check Original Max
    if (original > maxOriginalAmplitude) {
      maxOriginalAmplitude = original;
      maxOriginalTime = time;
    }

    // Check Isolated Max
    if (isolated > maxIsolatedAmplitude) {
      maxIsolatedAmplitude = isolated;
      maxIsolatedTime = time;
    }

    data.push({
      time,
      original,
      isolated,
    });
  }

  // Define a region +/- 5% of duration around the max peak, or fixed seconds (max 5s)
  const regionWindow = Math.min(duration * 0.1, 5); 

  const originalPeakRegion: PeakRegion | undefined = buffer1 ? {
      start: Math.max(0, maxOriginalTime - (regionWindow / 2)),
      end: Math.min(duration, maxOriginalTime + (regionWindow / 2)),
      amplitude: maxOriginalAmplitude
  } : undefined;

  const isolatedPeakRegion: PeakRegion | undefined = buffer2 ? {
      start: Math.max(0, maxIsolatedTime - (regionWindow / 2)),
      end: Math.min(duration, maxIsolatedTime + (regionWindow / 2)),
      amplitude: maxIsolatedAmplitude
  } : undefined;

  return { points: data, originalPeakRegion, isolatedPeakRegion };
};

// Format seconds to MM:SS.ms
export const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

// Convert AudioBuffer to WAV Blob
export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this example)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while (pos < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });

  function setUint16(data: any) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: any) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/wav;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};