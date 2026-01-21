"use client";

import { useEffect, useRef, useState } from "react";

export default function InteractiveEyes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePupilPos = (eyeRect: DOMRect) => {
    if (!eyeRect) return { x: 0, y: 0 };
    
    const eyeCenterX = eyeRect.left + eyeRect.width / 2;
    const eyeCenterY = eyeRect.top + eyeRect.height / 2;
    
    const angle = Math.atan2(mousePos.y - eyeCenterY, mousePos.x - eyeCenterX);
    const distance = Math.min(
      eyeRect.width / 4,
      Math.hypot(mousePos.x - eyeCenterX, mousePos.y - eyeCenterY) / 10
    );
    
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    };
  };

  // We need to get the eye positions. Since this is a simple effect, we can just calculate offsets relative to the container center
  // But strictly, we should measure the eyes. For simplicity/performance in this component, we'll do a basic offset calculation during render or just use the center of the screen/container if easier.
  // Better approach: Calculate translate inside the style directly based on window center for now, or use refs for each eye if we want perfect precision.
  // Let's use a ref-based approach for the "eyes" container.

  const [pupil1Pos, setPupil1Pos] = useState({ x: 0, y: 0 });
  const [pupil2Pos, setPupil2Pos] = useState({ x: 0, y: 0 });
  const eye1Ref = useRef<HTMLDivElement>(null);
  const eye2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eye1Ref.current) {
        setPupil1Pos(calculatePupilPos(eye1Ref.current.getBoundingClientRect()));
    }
    if (eye2Ref.current) {
        setPupil2Pos(calculatePupilPos(eye2Ref.current.getBoundingClientRect()));
    }
  }, [mousePos]);

  return (
    <div ref={containerRef} className="flex gap-4 justify-center mb-8 pointer-events-none select-none">
      {/* Eye 1 */}
      <div 
        ref={eye1Ref}
        className="w-8 h-12 bg-white rounded-[20px] flex items-center justify-center overflow-hidden relative border border-gray-100 shadow-sm"
      >
        <div 
          className="w-4 h-6 bg-gray-900 rounded-[50%] absolute transition-transform duration-150 ease-out"
          style={{ transform: `translate(${pupil1Pos.x * 0.8}px, ${pupil1Pos.y * 1.5}px)` }} // Adjust multiplier for movement range
        />
        {/* Reflection */}
        <div className="w-1 h-1 bg-white rounded-full absolute bottom-2 z-10 opacity-90 transition-transform duration-150 ease-out" 
             style={{ transform: `translate(${pupil1Pos.x * 0.8}px, ${pupil1Pos.y * 1.5 + 8}px)` }}
        />
      </div>
      
      {/* Eye 2 */}
      <div 
        ref={eye2Ref}
        className="w-8 h-12 bg-white rounded-[20px] flex items-center justify-center overflow-hidden relative border border-gray-100 shadow-sm"
      >
        <div 
          className="w-4 h-6 bg-gray-900 rounded-full absolute transition-transform duration-150 ease-out"
          style={{ transform: `translate(${pupil2Pos.x * 0.8}px, ${pupil2Pos.y * 1.5}px)` }}
        />
        {/* Reflection */}
        <div className="w-1 h-1 bg-white rounded-full absolute bottom-2 z-10 opacity-90 transition-transform duration-150 ease-out" 
             style={{ transform: `translate(${pupil2Pos.x * 0.8}px, ${pupil2Pos.y * 1.5 + 8}px)` }}
        />
      </div>
    </div>
  );
}
