import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Baby, Brain, GraduationCap, Crown, Flame, Medal, Star, NotebookPen, BookOpen, Trophy, Lock
} from 'lucide-react';
import { toast } from 'sonner';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
}

interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

const iconMap: Record<string, React.ElementType> = {
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
};

const AchievementsBadges = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    try {
      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('requirement_value', { ascending: true });

      if (achievementsError) {
        console.error('Error fetching achievements:', achievementsError);
        return;
      }

      setAchievements(allAchievements || []);

      // Check and unlock any new achievements
      const { data: checkResult, error: checkError } = await supabase.rpc('check_achievements', {
        uid: user?.id
      });

      if (checkError) {
        console.error('Error checking achievements:', checkError);
      } else if (checkResult) {
        // Find newly unlocked achievements
        const newOnes = checkResult
          .filter((a: { just_unlocked: boolean }) => a.just_unlocked)
          .map((a: { achievement_id: string }) => a.achievement_id);
        
        if (newOnes.length > 0) {
          setNewlyUnlocked(newOnes);
          const unlockedNames = checkResult
            .filter((a: { just_unlocked: boolean }) => a.just_unlocked)
            .map((a: { achievement_name: string }) => a.achievement_name);
          
          unlockedNames.forEach((name: string) => {
            toast.success(`🏆 Achievement Unlocked: ${name}!`);
          });
        }
      }

      // Fetch user's unlocked achievements
      const { data: userAchievementsData, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user?.id);

      if (userAchievementsError) {
        console.error('Error fetching user achievements:', userAchievementsError);
        return;
      }

      setUserAchievements(userAchievementsData || []);
    } catch (error) {
      console.error('Error in fetchAchievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (achievementId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  const isNewlyUnlocked = (achievementId: string) => {
    return newlyUnlocked.includes(achievementId);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  const unlockedCount = userAchievements.length;
  const totalCount = achievements.length;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {unlockedCount} / {totalCount} unlocked
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {achievements.map((achievement) => {
          const IconComponent = iconMap[achievement.icon] || Trophy;
          const unlocked = isUnlocked(achievement.id);
          const isNew = isNewlyUnlocked(achievement.id);

          return (
            <div
              key={achievement.id}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-2 transition-all ${
                unlocked 
                  ? isNew 
                    ? 'bg-primary/20 border-2 border-primary animate-pulse' 
                    : 'bg-primary/10 border border-primary/30'
                  : 'bg-muted/30 border border-border'
              }`}
              title={`${achievement.name}: ${achievement.description}`}
            >
              {!unlocked && (
                <div className="absolute inset-0 bg-background/60 rounded-xl flex items-center justify-center">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <IconComponent 
                className={`h-6 w-6 mb-1 ${
                  unlocked ? 'text-primary' : 'text-muted-foreground/50'
                }`} 
              />
              <span className={`text-[10px] text-center font-medium leading-tight ${
                unlocked ? 'text-foreground' : 'text-muted-foreground/50'
              }`}>
                {achievement.name}
              </span>
              {isNew && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] px-1 rounded-full">
                  NEW
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsBadges;