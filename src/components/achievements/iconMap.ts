import { 
  Baby, Brain, GraduationCap, Crown, Flame, Medal, Star, NotebookPen, BookOpen, Trophy, 
  Lock, TrendingUp, RefreshCw, Zap, Timer, Bolt, Shield, Calendar, Target, Award, Globe,
  Sparkles, Crosshair, CheckCircle, Swords, PlayCircle, Infinity, Gem, Flag, Compass, type LucideIcon
} from 'lucide-react';

// Map of icon names to components
export const iconMap: Record<string, LucideIcon> = {
  'baby': Baby,
  'brain': Brain,
  'graduation-cap': GraduationCap,
  'crown': Crown,
  'flame': Flame,
  'medal': Medal,
  'star': Star,
  'notebook-pen': NotebookPen,
  'book-open': BookOpen,
  'trophy': Trophy,
  'lock': Lock,
  'trending-up': TrendingUp,
  'refresh-cw': RefreshCw,
  'zap': Zap,
  'timer': Timer,
  'bolt': Bolt,
  'shield': Shield,
  'calendar': Calendar,
  'target': Target,
  'award': Award,
  'globe': Globe,
  'sparkles': Sparkles,
  'crosshair': Crosshair,
  'check-circle': CheckCircle,
  'swords': Swords,
  'play-circle': PlayCircle,
  'infinity': Infinity,
  'gem': Gem,
  'flag': Flag,
  'compass': Compass,
};

export const getAchievementIcon = (iconName: string): LucideIcon => {
  return iconMap[iconName] || Trophy;
};
