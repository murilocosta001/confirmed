import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const Logo = ({ className, showText = true, size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="gradient-primary rounded-lg p-1.5">
        <CheckCircle2 className={cn("text-primary-foreground", sizeClasses[size])} />
      </div>
      {showText && (
        <span className={cn("font-bold tracking-tight text-foreground", textSizes[size])}>
          Confirmed
        </span>
      )}
    </div>
  );
};

export default Logo;
