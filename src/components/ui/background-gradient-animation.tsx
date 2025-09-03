"use client";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export const BackgroundGradientAnimation = ({
  gradientBackgroundStart = "rgb(5, 8, 20)", // bluish black
  gradientBackgroundEnd = "rgb(0, 0, 0)", // deep black
  firstColor = "255, 255, 200", // whitish yellow
  secondColor = "255, 165, 0", // orange
  thirdColor = "128, 0, 128", // purple
  fourthColor = "0, 0, 139", // dark blue
  fifthColor = "255, 192, 203", // rose pink
  size = "55%",
  blendingValue = "screen",
  children,
  className,
  containerClassName,
}: {
  gradientBackgroundStart?: string;
  gradientBackgroundEnd?: string;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  fourthColor?: string;
  fifthColor?: string;
  size?: string;
  blendingValue?: string;
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) => {
  const [isSafari, setIsSafari] = useState(false);
  const [randomBalls, setRandomBalls] = useState<
    { x: number; y: number; size: number; vx: number; vy: number; color: string }[]
  >([]);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
    }

    if (typeof document !== "undefined") {
      document.body.style.setProperty("--gradient-background-start", gradientBackgroundStart);
      document.body.style.setProperty("--gradient-background-end", gradientBackgroundEnd);
      document.body.style.setProperty("--first-color", firstColor);
      document.body.style.setProperty("--second-color", secondColor);
      document.body.style.setProperty("--third-color", thirdColor);
      document.body.style.setProperty("--fourth-color", fourthColor);
      document.body.style.setProperty("--fifth-color", fifthColor);
      document.body.style.setProperty("--size", size);
      document.body.style.setProperty("--blending-value", blendingValue);
    }

    // Initialize random balls with new colors and increased count
    const colors = [firstColor, secondColor, thirdColor, fourthColor, fifthColor];
    const balls = Array.from({ length: 15 }).map(() => ({ // Increased to 15 balls
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 1.5, // slightly faster
      vy: (Math.random() - 0.5) * 1.5,
      size: 30 + Math.random() * 30, // Different sizes, not too large
      color: `rgba(${colors[Math.floor(Math.random() * colors.length)]},0.6)`,
    }));
    setRandomBalls(balls);
  }, [
    gradientBackgroundStart,
    gradientBackgroundEnd,
    firstColor,
    secondColor,
    thirdColor,
    fourthColor,
    fifthColor,
    size,
    blendingValue,
  ]);

  useEffect(() => {
    let animationFrameId: number;

    const animateBalls = () => {
      setRandomBalls((prev) =>
        prev.map((b) => {
          let newX = b.x + b.vx;
          let newY = b.y + b.vy;

          // Bounce in viewport
          if (newX < 0 || newX > window.innerWidth) b.vx *= -1;
          if (newY < 0 || newY > window.innerHeight) b.vy *= -1;

          return { ...b, x: newX, y: newY };
        })
      );

      animationFrameId = requestAnimationFrame(animateBalls);
    };

    animationFrameId = requestAnimationFrame(animateBalls);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div
      className={cn(
        "h-screen w-screen fixed inset-0 overflow-hidden bg-[linear-gradient(160deg,var(--gradient-background-start),var(--gradient-background-end))]",
        containerClassName
      )}
    >
      {/* Blur Filter */}
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      {/* Gradient Balls */}
      <div
        className={cn(
          "gradients-container h-full w-full blur-3xl",
          isSafari ? "blur-2xl" : "[filter:url(#blurMe)_blur(40px)]"
        )}
      >
        {/* Center ball - smaller, shifted down */}
        <div
          className={cn(
            "absolute animate-centerPulse opacity-100",
            "[background:radial-gradient(circle_at_center,_rgba(var(--first-color),0.9)_0,_rgba(var(--first-color),0)_60%)]",
            "[mix-blend-mode:var(--blending-value)]",
            "w-[calc(var(--size)*0.7)] h-[calc(var(--size)*0.7)]",
            "top-[calc(50%+50px-var(--size)*0.35)] left-[calc(50%-var(--size)*0.35)]"
          )}
        ></div>

        {/* Diagonal blobs - faster */}
        <div
          className={cn(
            "absolute animate-diagFast opacity-70",
            "[background:radial-gradient(circle_at_center,_rgba(var(--second-color),0.85)_0,_rgba(var(--second-color),0)_55%)]",
            "[mix-blend-mode:var(--blending-value)]",
            "w-[var(--size)] h-[var(--size)]",
            "top-[15%] left-[10%]"
          )}
        ></div>
        <div
          className={cn(
            "absolute animate-diagMed opacity-80",
            "[background:radial-gradient(circle_at_center,_rgba(var(--third-color),0.85)_0,_rgba(var(--third-color),0)_55%)]",
            "[mix-blend-mode:var(--blending-value)]",
            "w-[var(--size)] h-[var(--size)]",
            "bottom-[15%] right-[10%]"
          )}
        ></div>

        {/* Random corner balls */}
        {randomBalls.map((b, i) => (
          <div
            key={i}
            className={cn(
              "absolute",
              `[background:radial-gradient(circle_at_center,${b.color} 0,${b.color.replace(/0\.6/, "0")} 55%)]`,
              "[mix-blend-mode:var(--blending-value)]",
              "opacity-60 rounded-full"
            )}
            style={{
              width: `${b.size}px`,
              height: `${b.size}px`,
              left: b.x,
              top: b.y,
              transform: "translate(-50%, -50%)",
            }}
          ></div>
        ))}
      </div>

      {/* Foreground Content */}
      <div className={cn("relative z-10", className)}>{children}</div>

      {/* Animations */}
      <style jsx>{`
        @keyframes centerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes diagFast {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-220px, -170px) scale(1.25); }
        }
        @keyframes diagMed {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(180px, 140px) scale(1.22); }
        }

        .animate-centerPulse { animation: centerPulse 14s ease-in-out infinite; }
        .animate-diagFast { animation: diagFast 12s ease-in-out infinite; } /* 1.5x speed */
        .animate-diagMed { animation: diagMed 15s ease-in-out infinite; } /* 1.2x speed */
      `}</style>
    </div>
  );
};