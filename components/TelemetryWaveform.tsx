
import React, { useEffect, useRef } from 'react';

interface Props {
  hr: number;
  color: string;
  rhythm: string;
}

const TelemetryWaveform: React.FC<Props> = ({ hr, color, rhythm }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const xRef = useRef<number>(0);
  const pointsRef = useRef<{x: number, y: number}[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.offsetWidth || 300;
    let height = canvas.offsetHeight || 100;
    canvas.width = width;
    canvas.height = height;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: rWidth, height: rHeight } = entry.contentRect;
        if (rWidth > 0 && rHeight > 0) {
          canvas.width = rWidth;
          canvas.height = rHeight;
        }
      }
    });
    resizeObserver.observe(canvas);

    const speed = 2.6; 
    
    let framesSinceLastBeat = 0;
    const isAfib = rhythm === "Atrial Fibrillation";
    const isVT = rhythm === "Ventricular Tachycardia";
    const isVF = rhythm === "Ventricular Fibrillation";

    const draw = () => {
      const currentWidth = canvas.width;
      const currentHeight = canvas.height;
      ctx.clearRect(0, 0, currentWidth, currentHeight);
      
      // Draw grid
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      // standard 25mm spacing grid
      for (let x = 0; x < currentWidth; x += 25) { ctx.moveTo(x, 0); ctx.lineTo(x, currentHeight); }
      for (let y = 0; y < currentHeight; y += 25) { ctx.moveTo(0, y); ctx.lineTo(currentWidth, y); }
      ctx.stroke();

      framesSinceLastBeat++;
      
      const currentBeatInterval = isAfib 
        ? ((60 / hr) * 60) * (0.8 + Math.random() * 0.4) 
        : (60 / hr) * 60;

      if (framesSinceLastBeat > currentBeatInterval) {
        framesSinceLastBeat = 0;
      }

      const t = framesSinceLastBeat;
      const midY = currentHeight / 2;
      let targetY = midY;

      // Scaling factors for the taller canvas
      const qrsAmplitude = currentHeight * 0.35; // R wave height relative to canvas
      const pAmplitude = currentHeight * 0.04;
      const tAmplitude = currentHeight * 0.08;

      const isPeakedT = rhythm === "Peaked T-Waves";
      const isSTE = rhythm === "ST Elevation";

      if (isVF) {
        // Ventricular Fibrillation: Chaos
        targetY = midY + (Math.random() - 0.5) * (currentHeight * 0.5);
      } else if (isVT) {
        // Ventricular Tachycardia: Wide, regular, no P waves
        if (t >= 0 && t < 15) {
          const sine = Math.sin((t / 15) * Math.PI);
          targetY = midY - (sine * (currentHeight * 0.4));
        }
      } else {
        // Standard P-QRS-T complexes with pathology
        if (!isAfib && t > 0 && t < 6) {
          targetY -= pAmplitude; // P-wave
        }
        else if (t >= 8 && t < 10) targetY += pAmplitude * 2; // Q
        else if (t >= 10 && t < 13) targetY -= qrsAmplitude; // R
        else if (t >= 13 && t < 16) {
            if (isSTE) targetY -= qrsAmplitude * 0.3; // ST Segment elevation
            else targetY += qrsAmplitude * 0.25; // S
        }
        else if (t >= 16 && t < 22) {
            if (isSTE) targetY -= qrsAmplitude * 0.25; 
            else targetY = midY;
        }
        else if (t >= 22 && t < 38) {
            if (isPeakedT) {
              const peakT = Math.sin(((t - 22) / 16) * Math.PI);
              targetY -= peakT * (currentHeight * 0.35); // Sharp peaked T
            } else if (isSTE) {
              targetY -= tAmplitude * 1.5;
            } else {
              const normT = Math.sin(((t - 22) / 16) * Math.PI);
              targetY -= normT * tAmplitude; // Normal T-wave
            }
        }

        // Afib baseline noise
        if (isAfib) {
            targetY += (Math.random() - 0.5) * 8;
        }
      }

      // Universal baseline noise (movement artifact etc)
      targetY += (Math.random() - 0.5) * 2;

      xRef.current = (xRef.current + speed) % currentWidth;
      pointsRef.current.push({ x: xRef.current, y: targetY });
      
      if (pointsRef.current.length > currentWidth / speed) {
        pointsRef.current.shift();
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5; // Thicker line for better visibility on larger strip
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;

      let isFirst = true;
      for (let i = 1; i < pointsRef.current.length; i++) {
        const p1 = pointsRef.current[i-1];
        const p2 = pointsRef.current[i];
        
        if (p2.x > p1.x) {
          if (isFirst) {
            ctx.moveTo(p1.x, p1.y);
            isFirst = false;
          }
          ctx.lineTo(p2.x, p2.y);
        } else {
          isFirst = true;
        }
      }
      ctx.stroke();

      requestRef.current = requestAnimationFrame(draw);
    };

    requestRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(requestRef.current);
      resizeObserver.disconnect();
    };
  }, [hr, color, rhythm]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block"
      style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
    />
  );
};

export default TelemetryWaveform;
