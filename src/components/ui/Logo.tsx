import { cn } from "@/lib/utils";
import logotipo from "@/assets/logotipo.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "light";
}

const Logo = ({ className, size = "md", variant = "default" }: LogoProps) => {
  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-10",
  };

  return (
    <div className={cn("flex items-center", className)}>
      <img 
        src={logotipo} 
        alt="Confirmed" 
        className={cn(
          "w-auto object-contain",
          sizeClasses[size],
          variant === "light" && "brightness-0 invert"
        )}
      />
    </div>
  );
};

export default Logo;
