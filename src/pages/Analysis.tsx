import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  Brain,
  Zap,
  ArrowRight,
  LogOut,
  User,
  Loader2,
  Sparkles,
  Star,
  Award,
  BookOpen,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import XpLevelBar from '@/components/header/XpLevelBar';
import StreakDisplay from '@/components/header/StreakDisplay';
import { useUserStats } from '@/hooks/useUserStats';
import ImprovementChart from '@/components/ImprovementChart';
import PerformanceOverview from '@/components/analysis/PerformanceOverview';
import StrengthsWeaknesses from '@/components/analysis/StrengthsWeaknesses';
import StudyRecommendations from '@/components/analysis/StudyRecommendations';
import QuizHistory from '@/components/analysis/QuizHistorySummary';
import { WeeklyGoalTracker } from '@/components/analysis/WeeklyGoalTracker';
import { TopicComparison } from '@/components/analysis/TopicComparison';

const Analysis = () => {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { stats } = useUserStats();
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    totalQuizzes: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    averageScore: 0,
    bestScore: 0,
    totalStudyTime: 0,
    topicsStudied: 0,
    strongTopics: 0,
    weakTopics: 0,
  });

  const displayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    if (user) {
      fetchOverallStats();
    }
  }, [user]);

  const fetchOverallStats = async () => {
    try {
      // Fetch leaderboard stats
      const { data: leaderboard } = await supabase
        .from('leaderboard_stats')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Fetch topic performance counts
      const { data: topicPerf } = await supabase
        .from('user_topic_performance')
        .select('strength_status')
        .eq('user_id', user?.id);

      // Calculate time from question attempts
      const { data: attempts } = await supabase
        .from('question_attempts')
        .select('time_taken_seconds')
        .eq('user_id', user?.id);

      const totalTime = attempts?.reduce((acc, a) => acc + (a.time_taken_seconds || 0), 0) || 0;

      const strongCount = topicPerf?.filter(t => t.strength_status === 'strong').length || 0;
      const weakCount = topicPerf?.filter(t => t.strength_status === 'weak').length || 0;

      setOverallStats({
        totalQuizzes: leaderboard?.total_quizzes || 0,
        totalQuestions: leaderboard?.total_questions || 0,
        correctAnswers: leaderboard?.total_correct || 0,
        averageScore: leaderboard?.average_score || 0,
        bestScore: leaderboard?.best_score || 0,
        totalStudyTime: totalTime,
        topicsStudied: topicPerf?.length || 0,
        strongTopics: strongCount,
        weakTopics: weakCount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Logo size="sm" />
          
          <div className="flex items-center gap-2">
            {stats && (
              <>
                <XpLevelBar
                  level={stats.level}
                  totalXp={stats.totalXp}
                  xpProgress={stats.xpProgress}
                  xpToNextLevel={stats.xpToNextLevel}
                  xpMultiplier={stats.xpMultiplier}
                />
                <StreakDisplay
                  currentStreak={stats.currentStreak}
                  longestStreak={stats.longestStreak}
                  streakProtections={stats.streakProtections}
                />
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden lg:block">
              Hi, {displayName}!
            </span>
            <Button variant="ghost" size="icon" onClick={() => navigate('/leaderboard')} title="Leaderboard">
              <Trophy className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Your Analysis
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track your progress and identify areas for improvement
            </p>
          </div>
          <Button variant="neon" onClick={() => navigate('/fix-weak-areas')}>
            <Zap className="h-4 w-4 mr-2" />
            Fix Weak Areas
          </Button>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overallStats.totalQuizzes}</p>
                  <p className="text-xs text-muted-foreground">Quizzes Taken</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Math.round(overallStats.averageScore)}%</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatTime(overallStats.totalStudyTime)}</p>
                  <p className="text-xs text-muted-foreground">Study Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-4/10">
                  <Brain className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overallStats.topicsStudied}</p>
                  <p className="text-xs text-muted-foreground">Topics Studied</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Goals Section */}
        <WeeklyGoalTracker />

        {/* Tabs for different analysis views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="glass-card w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Global Comparison
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="strengths" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Strengths & Weaknesses
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <PerformanceOverview overallStats={overallStats} />
            <QuizHistory />
          </TabsContent>

          <TabsContent value="compare" className="space-y-6">
            <TopicComparison />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Improvement Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ImprovementChart />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strengths" className="space-y-6">
            <StrengthsWeaknesses />
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            <StudyRecommendations />
          </TabsContent>
        </Tabs>
      </main>

      {/* Back to Dashboard FAB */}
      <Button
        variant="outline"
        className="fixed bottom-6 right-6 shadow-lg"
        onClick={() => navigate('/dashboard')}
      >
        <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
        Back to Dashboard
      </Button>
    </div>
  );
};

export default Analysis;
