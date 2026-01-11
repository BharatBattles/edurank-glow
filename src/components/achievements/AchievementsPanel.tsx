import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import AchievementCard from './AchievementCard';
import AchievementUnlockCelebration from './AchievementUnlockCelebration';
import { getAchievementIcon } from './iconMap';
import { 
  Achievement, 
  AchievementCategory, 
  AchievementProgress, 
  UserAchievement,
  CheckAchievementResult,
  CATEGORY_INFO 
} from './types';

type FilterMode = 'all' | 'unlocked' | 'locked';

const AchievementsPanel = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<Record<string, AchievementProgress>>({});
  const [userAchievements, setUserAchievements] = useState<Record<string, UserAchievement>>({});
  const [loading, setLoading] = useState(true);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const [celebratingAchievement, setCelebratingAchievement] = useState<Achievement | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<AchievementCategory>>(new Set());

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
        .order('sort_order', { ascending: true });

      if (achievementsError) throw achievementsError;

      setAchievements((allAchievements || []) as Achievement[]);

      // Check achievements and get progress
      const { data: checkResult, error: checkError } = await supabase.rpc('check_achievements_v2', {
        uid: user?.id
      });

      if (checkError) {
        console.error('Error checking achievements:', checkError);
        // Fallback to old function
        const { data: oldResult } = await supabase.rpc('check_achievements', {
          uid: user?.id
        });
        if (oldResult) {
          const newOnes = oldResult
            .filter((a: { just_unlocked: boolean }) => a.just_unlocked)
            .map((a: { achievement_id: string }) => a.achievement_id);
          setNewlyUnlocked(newOnes);
        }
      } else if (checkResult) {
        // Process results
        const newOnes = (checkResult as CheckAchievementResult[])
          .filter(a => a.just_unlocked)
          .map(a => a.achievement_id);

        if (newOnes.length > 0) {
          setNewlyUnlocked(newOnes);
          
          // Show celebration for first newly unlocked
          const firstNew = (checkResult as CheckAchievementResult[]).find(a => a.just_unlocked);
          if (firstNew) {
            const achievementData = (allAchievements || []).find(a => a.id === firstNew.achievement_id);
            if (achievementData) {
              setCelebratingAchievement(achievementData as Achievement);
            }
          }

          // Toast for others
          (checkResult as CheckAchievementResult[])
            .filter(a => a.just_unlocked)
            .slice(1)
            .forEach(a => {
              toast.success(`🏆 Achievement Unlocked: ${a.achievement_name}!`);
            });
        }

        // Build progress map
        const progressMap: Record<string, AchievementProgress> = {};
        (checkResult as CheckAchievementResult[]).forEach(r => {
          progressMap[r.achievement_id] = {
            achievement_id: r.achievement_id,
            current_value: r.progress,
            target_value: r.progress_max,
          };
        });
        setProgress(progressMap);
      }

      // Fetch user achievements
      const { data: userAchievementsData, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at, progress, progress_max, reward_claimed, reward_expires_at')
        .eq('user_id', user?.id);

      if (userAchievementsError) throw userAchievementsError;

      const userAchievementMap: Record<string, UserAchievement> = {};
      (userAchievementsData || []).forEach(ua => {
        userAchievementMap[ua.achievement_id] = ua as UserAchievement;
      });
      setUserAchievements(userAchievementMap);

    } catch (error) {
      console.error('Error in fetchAchievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: AchievementCategory) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Group achievements by category
  const groupedAchievements = achievements.reduce((acc, achievement) => {
    const category = achievement.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {} as Record<AchievementCategory, Achievement[]>);

  // Filter achievements
  const filterAchievements = (achievements: Achievement[]) => {
    return achievements.filter(a => {
      const isUnlocked = !!userAchievements[a.id];
      if (filterMode === 'unlocked') return isUnlocked;
      if (filterMode === 'locked') return !isUnlocked;
      return true;
    });
  };

  // Calculate stats
  const totalAchievements = achievements.length;
  const unlockedCount = Object.keys(userAchievements).length;
  const completionPercent = totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Celebration modal */}
      <AchievementUnlockCelebration
        achievement={celebratingAchievement}
        onClose={() => setCelebratingAchievement(null)}
      />

      <div className="space-y-6">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {unlockedCount} / {totalAchievements} Unlocked
            </h3>
            <p className="text-sm text-muted-foreground">
              {Math.floor(completionPercent)}% complete
            </p>
          </div>
          <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-2 h-6">All</TabsTrigger>
              <TabsTrigger value="unlocked" className="text-xs px-2 h-6">Unlocked</TabsTrigger>
              <TabsTrigger value="locked" className="text-xs px-2 h-6">Locked</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          {(Object.entries(CATEGORY_INFO) as [AchievementCategory, typeof CATEGORY_INFO[AchievementCategory]][]).map(([category, info]) => {
            const categoryAchievements = filterAchievements(groupedAchievements[category] || []);
            const categoryUnlocked = categoryAchievements.filter(a => !!userAchievements[a.id]).length;
            const isExpanded = expandedCategories.has(category);
            const IconComponent = getAchievementIcon(info.icon);

            if (categoryAchievements.length === 0) return null;

            return (
              <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg bg-background ${info.color}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <span className="font-medium text-sm">{info.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {categoryUnlocked}/{categoryAchievements.length}
                        </span>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid gap-3 mt-3 pl-2"
                  >
                    {categoryAchievements.map(achievement => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        progress={progress[achievement.id]}
                        userAchievement={userAchievements[achievement.id]}
                        isNew={newlyUnlocked.includes(achievement.id)}
                      />
                    ))}
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default AchievementsPanel;
