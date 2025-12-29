import { TrendingUp, FileText, Sparkles } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo = ({ size = 'md', showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        {/* Background circle */}
        <div className="absolute inset-0 rounded-full bg-muted/50" />
        
        {/* Document icon */}
        <FileText className="absolute h-1/2 w-1/2 text-muted-foreground/70 -translate-x-1" />
        
        {/* Rising arrow with gradient effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <TrendingUp className="h-3/5 w-3/5 text-primary translate-x-1 translate-y-[-2px]" />
        </div>
        
        {/* Sparkles */}
        <Sparkles className="absolute top-0 right-0 h-1/4 w-1/4 text-primary animate-pulse" />
      </div>

      {showText && (
        <span className={`font-display font-bold ${textSizes[size]} neon-text`}>
          EduRank
        </span>
      )}
    </div>
  );
};

export default Logo;
