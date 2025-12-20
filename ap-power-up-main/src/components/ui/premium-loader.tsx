import { cn } from "@/lib/utils";

interface PremiumLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function PremiumLoader({ size = "md", className }: PremiumLoaderProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const dotSizeClasses = {
    sm: "w-1 h-1",
    md: "w-2 h-2",
    lg: "w-3 h-3",
    xl: "w-4 h-4",
  };

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      {/* Outer rotating circle */}
      <div
        className={cn(
          "absolute inset-0 rounded-full border-2 border-transparent",
          "border-t-primary border-r-primary/50",
          "animate-spin"
        )}
        style={{
          animationDuration: "1s",
          animationTimingFunction: "linear",
        }}
      />
      
      {/* Middle pulsing circle */}
      <div
        className={cn(
          "absolute rounded-full",
          "bg-gradient-to-r from-primary via-secondary to-accent",
          "animate-pulse-slow opacity-60"
        )}
        style={{
          width: "70%",
          height: "70%",
          animationDuration: "1.5s",
          animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
        }}
      />
      
      {/* Inner pulsing dot */}
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "absolute rounded-full bg-gradient-to-r from-primary via-secondary to-accent",
            dotSizeClasses[size],
            "animate-pulse"
          )}
          style={{
            animationDuration: "1.2s",
          }}
        />
      </div>
    </div>
  );
}

// Full screen loader variant
export function PremiumLoaderFullScreen({ className }: { className?: string }) {
  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-background", className)}>
      <div className="flex flex-col items-center gap-4">
        <PremiumLoader size="xl" />
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0s" }} />
          <div className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: "0.2s" }} />
          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    </div>
  );
}

