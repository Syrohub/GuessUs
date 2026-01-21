const fs = require('fs');
const path = require('path');

const sampleRate = 44100;

// Helper to create WAV buffer
function createWavBuffer(samples) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;
  buffer.writeUInt16LE(1, offset); offset += 2; // PCM
  buffer.writeUInt16LE(1, offset); offset += 2; // mono
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(sampleRate * 2, offset); offset += 4;
  buffer.writeUInt16LE(2, offset); offset += 2;
  buffer.writeUInt16LE(16, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  for (let i = 0; i < numSamples; i++) {
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(samples[i] * 32767)));
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

// Envelope functions
function adsr(t, attack, decay, sustain, release, duration) {
  if (t < attack) return t / attack;
  if (t < attack + decay) return 1 - (1 - sustain) * (t - attack) / decay;
  if (t < duration - release) return sustain;
  if (t < duration) return sustain * (duration - t) / release;
  return 0;
}

function fadeOut(t, duration, fadeStart = 0.7) {
  if (t > duration * fadeStart) {
    return 1 - (t - duration * fadeStart) / (duration * (1 - fadeStart));
  }
  return 1;
}

// Generate CORRECT sound - pleasant major chord arpeggio (C-E-G-C)
function generateCorrect() {
  const duration = 0.35;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  
  // Major chord frequencies (C5, E5, G5)
  const notes = [
    { freq: 523.25, start: 0, dur: 0.35 },      // C5
    { freq: 659.25, start: 0.05, dur: 0.30 },   // E5
    { freq: 783.99, start: 0.10, dur: 0.25 },   // G5
  ];
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    for (const note of notes) {
      if (t >= note.start && t < note.start + note.dur) {
        const localT = t - note.start;
        const env = adsr(localT, 0.01, 0.05, 0.6, 0.1, note.dur);
        sample += Math.sin(2 * Math.PI * note.freq * localT) * env * 0.25;
        // Add soft harmonic
        sample += Math.sin(2 * Math.PI * note.freq * 2 * localT) * env * 0.08;
      }
    }
    
    samples[i] = sample * fadeOut(t, duration, 0.6);
  }
  
  return createWavBuffer(samples);
}

// Generate SKIP sound - soft descending whoosh
function generateSkip() {
  const duration = 0.2;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    
    // Descending frequency
    const freq = 600 - t * 2000;
    const env = adsr(t, 0.01, 0.05, 0.5, 0.1, duration);
    
    // Soft sine with slight noise
    let sample = Math.sin(2 * Math.PI * Math.max(100, freq) * t) * env * 0.35;
    
    // Add subtle noise for "whoosh" effect
    sample += (Math.random() - 0.5) * env * 0.1 * (1 - t / duration);
    
    samples[i] = sample;
  }
  
  return createWavBuffer(samples);
}

// Generate TICK sound - soft wooden metronome click
function generateTick() {
  const duration = 0.06;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    
    // Sharp attack, quick decay
    const env = Math.exp(-t * 80);
    
    // Mix of frequencies for wooden sound
    let sample = 0;
    sample += Math.sin(2 * Math.PI * 1800 * t) * 0.3;
    sample += Math.sin(2 * Math.PI * 3200 * t) * 0.15;
    sample += Math.sin(2 * Math.PI * 800 * t) * 0.2;
    
    // Add click transient
    if (t < 0.002) {
      sample += (Math.random() - 0.5) * 0.5;
    }
    
    samples[i] = sample * env * 0.5;
  }
  
  return createWavBuffer(samples);
}

// Generate TIMEUP sound - attention-grabbing but not annoying double tone
function generateTimeup() {
  const duration = 0.6;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  
  // Two-tone alert (like phone notification)
  const tones = [
    { freq: 880, start: 0, dur: 0.15 },      // A5
    { freq: 698.46, start: 0.18, dur: 0.15 }, // F5
    { freq: 880, start: 0.36, dur: 0.15 },    // A5
  ];
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    for (const tone of tones) {
      if (t >= tone.start && t < tone.start + tone.dur) {
        const localT = t - tone.start;
        const env = adsr(localT, 0.008, 0.02, 0.7, 0.05, tone.dur);
        sample += Math.sin(2 * Math.PI * tone.freq * localT) * env * 0.35;
        // Soft harmonic
        sample += Math.sin(2 * Math.PI * tone.freq * 1.5 * localT) * env * 0.1;
      }
    }
    
    samples[i] = sample;
  }
  
  return createWavBuffer(samples);
}

// Generate WIN sound - triumphant fanfare with major chord progression
function generateWin() {
  const duration = 1.0;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  
  // Triumphant ascending arpeggio: C-E-G-C (octave higher)
  const notes = [
    { freq: 523.25, start: 0, dur: 0.25 },     // C5
    { freq: 659.25, start: 0.12, dur: 0.25 },  // E5
    { freq: 783.99, start: 0.24, dur: 0.25 },  // G5
    { freq: 1046.50, start: 0.36, dur: 0.55 }, // C6 (sustained)
  ];
  
  // Add bass note
  const bassFreq = 261.63; // C4
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    // Arpeggio notes
    for (const note of notes) {
      if (t >= note.start && t < note.start + note.dur) {
        const localT = t - note.start;
        const env = adsr(localT, 0.015, 0.05, 0.7, 0.15, note.dur);
        sample += Math.sin(2 * Math.PI * note.freq * localT) * env * 0.2;
        // Rich harmonics
        sample += Math.sin(2 * Math.PI * note.freq * 2 * localT) * env * 0.08;
        sample += Math.sin(2 * Math.PI * note.freq * 3 * localT) * env * 0.04;
      }
    }
    
    // Sustained bass
    if (t < 0.9) {
      const bassEnv = adsr(t, 0.02, 0.1, 0.5, 0.2, 0.9);
      sample += Math.sin(2 * Math.PI * bassFreq * t) * bassEnv * 0.15;
    }
    
    // Sparkle effect at the end
    if (t > 0.5 && t < 0.9) {
      const sparkleFreq = 2093; // C7
      const sparkleEnv = Math.sin((t - 0.5) * Math.PI / 0.4) * 0.1;
      sample += Math.sin(2 * Math.PI * sparkleFreq * t) * sparkleEnv;
    }
    
    samples[i] = sample * fadeOut(t, duration, 0.75);
  }
  
  return createWavBuffer(samples);
}

// Generate all sounds
const soundsDir = path.join(__dirname, 'public', 'sounds');

fs.mkdirSync(soundsDir, { recursive: true });

fs.writeFileSync(path.join(soundsDir, 'correct.wav'), generateCorrect());
console.log('Generated: correct.wav - Pleasant major chord');

fs.writeFileSync(path.join(soundsDir, 'skip.wav'), generateSkip());
console.log('Generated: skip.wav - Soft descending whoosh');

fs.writeFileSync(path.join(soundsDir, 'tick.wav'), generateTick());
console.log('Generated: tick.wav - Soft wooden click');

fs.writeFileSync(path.join(soundsDir, 'timeup.wav'), generateTimeup());
console.log('Generated: timeup.wav - Attention double-tone');

fs.writeFileSync(path.join(soundsDir, 'win.wav'), generateWin());
console.log('Generated: win.wav - Triumphant fanfare');

// Generate READY sound - energetic "let's go!" startup sound
function generateReady() {
  const duration = 0.4;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  
  // Quick ascending power chord (like game start)
  const notes = [
    { freq: 329.63, start: 0, dur: 0.12 },     // E4
    { freq: 440.00, start: 0.08, dur: 0.12 },  // A4
    { freq: 523.25, start: 0.15, dur: 0.25 },  // C5 (sustained)
    { freq: 659.25, start: 0.15, dur: 0.25 },  // E5 (sustained)
  ];
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    for (const note of notes) {
      if (t >= note.start && t < note.start + note.dur) {
        const localT = t - note.start;
        const env = adsr(localT, 0.008, 0.03, 0.7, 0.08, note.dur);
        sample += Math.sin(2 * Math.PI * note.freq * localT) * env * 0.22;
        // Bright harmonics for energy
        sample += Math.sin(2 * Math.PI * note.freq * 2 * localT) * env * 0.1;
        sample += Math.sin(2 * Math.PI * note.freq * 3 * localT) * env * 0.05;
      }
    }
    
    // Add slight "whoosh" for energy
    if (t < 0.15) {
      const whooshEnv = Math.sin(t * Math.PI / 0.15) * 0.08;
      sample += (Math.random() - 0.5) * whooshEnv;
    }
    
    samples[i] = sample * fadeOut(t, duration, 0.7);
  }
  
  return createWavBuffer(samples);
}

fs.writeFileSync(path.join(soundsDir, 'ready.wav'), generateReady());
console.log('Generated: ready.wav - Energetic start sound');

console.log('\n✅ All sounds generated with improved quality!');
