import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance = null;

export const getFFmpeg = async (onProgress = null) => {
  if (ffmpegInstance) {
    if (onProgress) {
      ffmpegInstance.on('progress', ({ progress, time }) => {
        onProgress(progress);
      });
    }
    return ffmpegInstance;
  }
  
  const ffmpeg = new FFmpeg();
  
  if (onProgress) {
    ffmpeg.on('progress', ({ progress, time }) => {
      onProgress(progress);
    });
  }
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  ffmpegInstance = ffmpeg;
  return ffmpegInstance;
};

export const trimMedia = async (file, startTime, endTime, onProgress) => {
  const ffmpeg = await getFFmpeg(onProgress);
  const ext = file.name.split('.').pop();
  const inputName = `input.${ext}`;
  const outputName = `trimmed.${ext}`;
  
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  
  // -ss for start time, -to for end time. -c copy to copy stream without re-encoding
  await ffmpeg.exec([
    '-i', inputName,
    '-ss', startTime.toString(),
    '-to', endTime.toString(),
    '-c', 'copy',
    outputName
  ]);
  
  const data = await ffmpeg.readFile(outputName);
  const type = file.type || (file.name.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4');
  return new File([data.buffer], outputName, { type });
};

export const generateThumbnail = (videoSource, timeInSeconds) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    
    if (typeof videoSource === 'string') {
      video.src = videoSource;
    } else {
      video.src = URL.createObjectURL(videoSource);
    }
    
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    // Once metadata is loaded, we can seek to the desired time
    video.onloadedmetadata = () => {
      // Avoid exactly 0.0s which is often a black frame
      video.currentTime = Math.max(timeInSeconds, 1.0);
    };
    
    // When the seek is completed, we can draw the frame
    video.onseeked = () => {
      // Small delay to ensure the browser has fully decoded the frame buffer
      setTimeout(() => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' }));
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
            URL.revokeObjectURL(video.src);
          }, 'image/jpeg', 0.8);
        } catch (err) {
          URL.revokeObjectURL(video.src);
          reject(err);
        }
      }, 200); // 200ms delay gives the decoder time to catch up
    };
    
    video.onerror = (e) => {
      let errMsg = 'Unknown error';
      if (video.error) {
        errMsg = `Code ${video.error.code}: ${video.error.message}`;
      } else if (typeof videoSource === 'string') {
        errMsg = 'Likely a CORS issue with the remote video URL.';
      }
      if (typeof videoSource !== 'string') {
        URL.revokeObjectURL(video.src);
      }
      console.error('Video load error:', video.error, e);
      reject(new Error(`Error loading video for thumbnail. ${errMsg}`));
    };
  });
};

export const compressAudio = async (file, onProgress) => {
  const ffmpeg = await getFFmpeg(onProgress);
  const ext = file.name.split('.').pop();
  const inputName = `input.${ext}`;
  const outputName = 'optimized.mp3';
  
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  
  // Compress to MP3, 96kbps (good for speech)
  await ffmpeg.exec([
    '-i', inputName,
    '-b:a', '96k',
    outputName
  ]);
  
  const data = await ffmpeg.readFile(outputName);
  return new File([data.buffer], outputName, { type: 'audio/mpeg' });
};

export const compressVideo = async (file, onProgress) => {
  const ffmpeg = await getFFmpeg(onProgress);
  const ext = file.name.split('.').pop();
  const inputName = `input.${ext}`;
  const outputName = 'optimized.mp4';
  
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  
  // Compress to 720p H.264
  await ffmpeg.exec([
    '-i', inputName,
    '-vf', 'scale=-2:720',
    '-c:v', 'libx264',
    '-crf', '28', // Good balance of quality and file size
    '-preset', 'ultrafast',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputName
  ]);
  
  const data = await ffmpeg.readFile(outputName);
  return new File([data.buffer], outputName, { type: 'video/mp4' });
};
