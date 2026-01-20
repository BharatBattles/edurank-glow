import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, Minus, Users, Clock, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface TopicStats {
  topicId: string;
  topicName: string;
  userAccuracy: number;
  globalAccuracy: number;
  userAvgTime: number;
  globalAvgTime: number;
  accuracyDelta: number;
  timeDelta: number;
  strengthStatus: string;
}

type SortOption = 'name' | 'accuracy_gap' | 'time_gap';
type FilterOption = 'all' | 'above' | 'below';

export const TopicComparison = () => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('accuracy_gap');
  const [filter, setFilter] = useState<FilterOption>('all');

  useEffect(() => {
    const fetchComparison = async () => {
      if (!user) return;

      try {
        // Fetch user's topic performance
        const { data: userPerformance, error: userError } = await supabase
          .from('user_topic_performance')
          .select(`
            topic_id,
            correct_answers,
            total_questions,
            avg_time_seconds,
            strength_status
          `)
          .eq('user_id', user.id);

        if (userError) throw userError;

        // Fetch topic names
        const topicIds = userPerformance?.map(up => up.topic_id) || [];
        const { data: topicsData } = await supabase
          .from('topics')
          .select('id, name')
          .in('id', topicIds);

        const topicNameMap = new Map(
          topicsData?.map(t => [t.id, t.name]) || []
        );

        // Fetch global stats
        const { data: globalStats, error: globalError } = await supabase
          .from('global_topic_stats')
          .select('*');

        if (globalError) throw globalError;

        // Create a map of global stats by topic_id
        const globalMap = new Map(
          globalStats?.map(g => [g.topic_id, g]) || []
        );

        // Combine user and global data
        const combinedStats: TopicStats[] = (userPerformance || []).map(up => {
          const global = globalMap.get(up.topic_id);
          const userAccuracy = up.total_questions > 0 
            ? (up.correct_answers / up.total_questions) * 100 
            : 0;
          const globalAccuracy = global?.avg_accuracy || 50;
          const userAvgTime = up.avg_time_seconds || 0;
          const globalAvgTime = global?.avg_time_seconds || 30;

          return {
            topicId: up.topic_id,
            topicName: topicNameMap.get(up.topic_id) || 'Unknown Topic',
            userAccuracy,
            globalAccuracy,
            userAvgTime,
            globalAvgTime,
            accuracyDelta: userAccuracy - globalAccuracy,
            timeDelta: globalAvgTime - userAvgTime, // Positive means faster than average
            strengthStatus: up.strength_status || 'unknown',
          };
        });

        setTopics(combinedStats);
      } catch (error) {
        console.error('Error fetching comparison data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [user]);

  const filteredAndSortedTopics = topics
    .filter(t => {
      if (filter === 'above') return t.accuracyDelta > 0;
      if (filter === 'below') return t.accuracyDelta < 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.topicName.localeCompare(b.topicName);
      if (sortBy === 'accuracy_gap') return Math.abs(b.accuracyDelta) - Math.abs(a.accuracyDelta);
      if (sortBy === 'time_gap') return Math.abs(b.timeDelta) - Math.abs(a.timeDelta);
      return 0;
    });

  // Prepare chart data
  const chartData = filteredAndSortedTopics.slice(0, 8).map(t => ({
    name: t.topicName.length > 15 ? t.topicName.substring(0, 15) + '...' : t.topicName,
    'Your Accuracy': Math.round(t.userAccuracy),
    'Global Average': Math.round(t.globalAccuracy),
    delta: t.accuracyDelta,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Complete some quizzes to see how you compare to other students!
          </p>
        </CardContent>
      </Card>
    );
  }

  const aboveAverageCount = topics.filter(t => t.accuracyDelta > 0).length;
  const belowAverageCount = topics.filter(t => t.accuracyDelta < 0).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/20">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{aboveAverageCount}</p>
                <p className="text-sm text-muted-foreground">Above Average</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/20">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{belowAverageCount}</p>
                <p className="text-sm text-muted-foreground">Below Average</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/20">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{topics.length}</p>
                <p className="text-sm text-muted-foreground">Topics Compared</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Accuracy Comparison Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="Your Accuracy" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Global Average" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="accuracy_gap">Largest Gap</SelectItem>
            <SelectItem value="time_gap">Time Difference</SelectItem>
            <SelectItem value="name">Topic Name</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filter} onValueChange={(v) => setFilter(v as FilterOption)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            <SelectItem value="above">Above Average</SelectItem>
            <SelectItem value="below">Below Average</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Topic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAndSortedTopics.map(topic => (
          <TopicComparisonCard key={topic.topicId} topic={topic} />
        ))}
      </div>
    </div>
  );
};

const TopicComparisonCard = ({ topic }: { topic: TopicStats }) => {
  const getDeltaIcon = (delta: number) => {
    if (delta > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (delta < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getDeltaColor = (delta: number) => {
    if (delta > 5) return 'text-green-500';
    if (delta < -5) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getStrengthBadge = (status: string) => {
    switch (status) {
      case 'strong': return <Badge variant="success">Strong</Badge>;
      case 'moderate': return <Badge variant="warning">Moderate</Badge>;
      case 'weak': return <Badge variant="destructive">Weak</Badge>;
      default: return null;
    }
  };

  return (
    <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-foreground">{topic.topicName}</h4>
            {getStrengthBadge(topic.strengthStatus)}
          </div>
          <div className={`flex items-center gap-1 ${getDeltaColor(topic.accuracyDelta)}`}>
            {getDeltaIcon(topic.accuracyDelta)}
            <span className="font-medium">
              {topic.accuracyDelta > 0 ? '+' : ''}{Math.round(topic.accuracyDelta)}%
            </span>
          </div>
        </div>

        {/* Accuracy Comparison */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Your Accuracy</span>
            <span className="text-foreground font-medium">{Math.round(topic.userAccuracy)}%</span>
          </div>
          <Progress value={topic.userAccuracy} className="h-2" />
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Global Average</span>
            <span className="text-muted-foreground">{Math.round(topic.globalAccuracy)}%</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-muted-foreground/50 rounded-full"
              style={{ width: `${topic.globalAccuracy}%` }}
            />
          </div>
        </div>

        {/* Time Comparison */}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Avg. Time</span>
          </div>
          <div className="text-right">
            <span className="text-foreground">{Math.round(topic.userAvgTime)}s</span>
            <span className="text-muted-foreground"> vs </span>
            <span className="text-muted-foreground">{Math.round(topic.globalAvgTime)}s</span>
            {topic.timeDelta > 0 && (
              <span className="text-green-500 ml-1">({Math.round(topic.timeDelta)}s faster)</span>
            )}
            {topic.timeDelta < 0 && (
              <span className="text-red-500 ml-1">({Math.abs(Math.round(topic.timeDelta))}s slower)</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
