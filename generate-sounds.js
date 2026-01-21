const fs = require('fs');
const path = require('path');

// Generate WAV file with sine wave tone
function generateWav(filename, frequency, duration, volume = 0.5, fadeOut = true) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = numSamples * blockAlign;
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // chunk size
  buffer.writeUInt16LE(1, offset); offset += 2; // PCM
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Generate samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = Math.sin(2 * Math.PI * frequency * t) * volume;
    
    // Apply fade out
    if (fadeOut) {
      const fadeStart = duration * 0.7;
      if (t > fadeStart) {
        const fadeProgress = (t - fadeStart) / (duration - fadeStart);
        sample *= (1 - fadeProgress);
      }
    }
    
    // Apply quick attack
    if (t < 0.01) {
      sample *= t / 0.01;
    }
    
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  fs.writeFileSync(filename, buffer);
  console.log(`Generated: ${filename}`);
}

// Generate multi-tone sound
function generateMultiTone(filename, tones, duration, volume = 0.5) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = numSamples * blockAlign;
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;
  buffer.writeUInt16LE(1, offset); offset += 2;
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Generate samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    // Find which tone segment we're in
    let currentTime = 0;
    for (const tone of tones) {
      if (t >= currentTime && t < currentTime + tone.duration) {
        const localT = t - currentTime;
        sample = Math.sin(2 * Math.PI * tone.freq * localT) * volume;
        
        // Quick attack
        if (localT < 0.005) {
          sample *= localT / 0.005;
        }
        // Quick release at end of tone
        const releaseTime = tone.duration - 0.01;
        if (localT > releaseTime) {
          sample *= 1 - (localT - releaseTime) / 0.01;
        }
        break;
      }
      currentTime += tone.duration;
    }
    
    // Overall envelope
    if (t > duration - 0.05) {
      sample *= (duration - t) / 0.05;
    }
    
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  fs.writeFileSync(filename, buffer);
  console.log(`Generated: ${filename}`);
}

const soundsDir = path.join(__dirname, 'public', 'sounds');

// Correct sound - pleasant ascending tone
generateMultiTone(path.join(soundsDir, 'correct.wav'), [
  { freq: 800, duration: 0.08 },
  { freq: 1200, duration: 0.12 }
], 0.2, 0.4);

// Skip sound - descending tone  
generateMultiTone(path.join(soundsDir, 'skip.wav'), [
  { freq: 400, duration: 0.08 },
  { freq: 250, duration: 0.12 }
], 0.2, 0.4);

// Tick sound - short click
generateWav(path.join(soundsDir, 'tick.wav'), 1000, 0.05, 0.3, true);

// Time up sound - alarm-like
generateMultiTone(path.join(soundsDir, 'timeup.wav'), [
  { freq: 800, duration: 0.15 },
  { freq: 600, duration: 0.15 },
  { freq: 800, duration: 0.15 },
  { freq: 600, duration: 0.15 }
], 0.6, 0.5);

// Win sound - triumphant fanfare
generateMultiTone(path.join(soundsDir, 'win.wav'), [
  { freq: 523, duration: 0.15 }, // C
  { freq: 659, duration: 0.15 }, // E
  { freq: 784, duration: 0.15 }, // G
  { freq: 1047, duration: 0.35 } // High C
], 0.8, 0.4);

console.log('All sounds generated!');
