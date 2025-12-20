import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AnimatedRouteProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedRoute({ children, className }: AnimatedRouteProps) {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4 duration-400",
        className
      )}
    >
      {children}
    </div>
  );
}

