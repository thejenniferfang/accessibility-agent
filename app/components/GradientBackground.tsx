"use client";

import { useEffect, useRef } from "react";

export default function GradientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    const draw = () => {
      time += 0.002;
      const width = canvas.width;
      const height = canvas.height;

      // Create gradient
      // Dark blue/black theme inspired by the "Animated Gradients" image
      // Using a mesh-like gradient effect
      
      const gradient1 = ctx.createRadialGradient(
        width * 0.2 + Math.sin(time) * 100,
        height * 0.3 + Math.cos(time) * 100,
        0,
        width * 0.5,
        height * 0.5,
        width
      );
      
      // Deep dark blue/black background
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, width, height);

      // Light blue beam
      const gradient2 = ctx.createLinearGradient(0, 0, width, height);
      gradient2.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient2.addColorStop(0.5, "rgba(59, 130, 246, 0.15)"); // Blue-500 with low opacity
      gradient2.addColorStop(1, "rgba(0, 0, 0, 0)");
      
      ctx.save();
      ctx.translate(width/2, height/2);
      ctx.rotate(time * 0.2);
      ctx.translate(-width/2, -height/2);
      ctx.fillStyle = gradient2;
      ctx.fillRect(-width, -height, width * 3, height * 3);
      ctx.restore();

      // Soft white/blue glow
      const glow = ctx.createRadialGradient(
        width * 0.8,
        height * 0.2,
        0,
        width * 0.8,
        height * 0.2,
        600
      );
      glow.addColorStop(0, "rgba(96, 165, 250, 0.1)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
      style={{ background: "#050505" }}
    />
  );
}
