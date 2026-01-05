import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Coins, RefreshCw, Loader2, Trophy, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AchievementsBadges from '@/components/AchievementsBadges';

interface UserCredits {
  credits_remaining: number;
  credits_used: number;
  last_reset_at: string;
}

const TOTAL_MONTHLY_CREDITS = 50;

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [wasReset, setWasReset] = useState(false);

  const displayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student';
  const email = user?.email || '';

  useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user]);

  const fetchCredits = async () => {
    try {
      // Use the check_and_reset_credits function which handles monthly reset
      const { data, error } = await supabase.rpc('check_and_reset_credits', { 
        uid: user?.id 
      });

      if (error) {
        console.error('Error checking credits:', error);
        // Fallback to direct query
        const { data: directData, error: directError } = await supabase
          .from('user_credits')
          .select('credits_remaining, credits_used, last_reset_at')
          .eq('user_id', user?.id)
          .single();
        
        if (!directError && directData) {
          setCredits(directData);
        }
      } else if (data && data.length > 0) {
        const creditData = data[0];
        setCredits({
          credits_remaining: creditData.credits_remaining,
          credits_used: creditData.credits_used,
          last_reset_at: new Date().toISOString()
        });
        if (creditData.was_reset) {
          setWasReset(true);
        }
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const usedPercent = TOTAL_MONTHLY_CREDITS > 0 
    ? ((credits?.credits_used || 0) / TOTAL_MONTHLY_CREDITS) * 100 
    : 0;

  // Calculate next reset date (1 month from last reset)
  const getNextResetDate = () => {
    if (!credits?.last_reset_at) return null;
    const lastReset = new Date(credits.last_reset_at);
    const nextReset = new Date(lastReset);
    nextReset.setMonth(nextReset.getMonth() + 1);
    return nextReset;
  };

  const nextResetDate = getNextResetDate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* Profile Info */}
        <section className="glass-card rounded-2xl p-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <p className="text-muted-foreground">{email}</p>
            </div>
          </div>
        </section>

        {/* Credits Section */}
        <section className="glass-card rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Monthly Credits</h2>
              <p className="text-sm text-muted-foreground">Resets every month</p>
            </div>
          </div>

          {wasReset && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-primary font-medium">
                🎉 Your credits have been reset for this month!
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Credits Remaining</span>
              <span className="text-2xl font-bold neon-text">{credits?.credits_remaining || 0}</span>
            </div>

            <Progress value={100 - usedPercent} className="h-3" />

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold">{credits?.credits_used || 0}</p>
                <p className="text-sm text-muted-foreground">Credits Used</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{TOTAL_MONTHLY_CREDITS}</p>
                <p className="text-sm text-muted-foreground">Monthly Limit</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Credit Costs:</strong>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Find Video: 1 credit</li>
                <li>• AI Notes: 4 credits</li>
                <li>• Quiz: 4 credits</li>
              </ul>
            </div>

            {nextResetDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t border-border">
                <RefreshCw className="h-4 w-4" />
                <span>Next reset: {nextResetDate.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </section>

        {/* Achievements Section */}
        <section className="glass-card rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Achievements</h2>
              <p className="text-sm text-muted-foreground">Unlock badges as you learn</p>
            </div>
          </div>
          <AchievementsBadges />
        </section>

        {/* Navigation Links */}
        <section className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('/quiz-history')}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Quiz History
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('/leaderboard')}
          >
            <Award className="h-4 w-4 mr-2" />
            Leaderboard
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('/about')}
          >
            About EduRank
          </Button>
        </section>
      </main>
    </div>
  );
};

export default Profile;