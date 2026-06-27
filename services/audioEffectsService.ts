
export const playDefibrillationSequence = async (audioCtx: AudioContext) => {
  // 1. Charging sound (rising pitch)
  const chargeOsc = audioCtx.createOscillator();
  const chargeGain = audioCtx.createGain();
  
  chargeOsc.type = 'sine';
  chargeOsc.frequency.setValueAtTime(300, audioCtx.currentTime);
  chargeOsc.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 1.8);
  
  chargeGain.gain.setValueAtTime(0, audioCtx.currentTime);
  chargeGain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.1);
  chargeGain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 1.7);
  chargeGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.8);
  
  chargeOsc.connect(chargeGain);
  chargeGain.connect(audioCtx.destination);
  
  chargeOsc.start();
  chargeOsc.stop(audioCtx.currentTime + 1.8);

  return new Promise(resolve => {
    setTimeout(() => {
      // 2. "Ready" High-pitched beep
      const readyOsc = audioCtx.createOscillator();
      const readyGain = audioCtx.createGain();
      
      readyOsc.frequency.setValueAtTime(2500, audioCtx.currentTime);
      readyGain.gain.setValueAtTime(0, audioCtx.currentTime);
      readyGain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
      readyGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
      
      readyOsc.connect(readyGain);
      readyGain.connect(audioCtx.destination);
      
      readyOsc.start();
      readyOsc.stop(audioCtx.currentTime + 0.15);

      setTimeout(() => {
        // 3. Shock/Discharge
        
        // Low thump
        const thump = audioCtx.createOscillator();
        const thumpGain = audioCtx.createGain();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(120, audioCtx.currentTime);
        thump.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.3);
        thumpGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
        thumpGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        thump.connect(thumpGain);
        thumpGain.connect(audioCtx.destination);
        thump.start();
        thump.stop(audioCtx.currentTime + 0.4);

        // White noise burst
        const bufferSize = audioCtx.sampleRate * 0.2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = buffer;
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        noiseSource.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseSource.start();
        
        resolve(true);
      }, 600);
    }, 1800);
  });
};

// Ambient Hospital Noise Manager
let ambientNodes: { source: AudioBufferSourceNode, gain: GainNode } | null = null;

export const startAmbientNoise = (ctx: AudioContext) => {
  if (ambientNodes) return; // Already playing

  const bufferSize = ctx.sampleRate * 2.0; // 2 seconds loop
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Pink noise roughly
  let b0, b1, b2, b3, b4, b5, b6;
  b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    data[i] *= 0.11; // Master volume for noise
    b6 = white * 0.115926;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  
  // Lowpass filter to make it sound like HVAC/Room tone
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  const gain = ctx.createGain();
  gain.gain.value = 0.05; // Very subtle background

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  source.start();
  ambientNodes = { source, gain };
};

export const stopAmbientNoise = () => {
  if (ambientNodes) {
    ambientNodes.source.stop();
    ambientNodes.source.disconnect();
    ambientNodes.gain.disconnect();
    ambientNodes = null;
  }
};
