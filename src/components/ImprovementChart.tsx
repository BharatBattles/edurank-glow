import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TopicPerformance {
  topic_id: string;
  topic_name: string;
  weakness_score: number;
  strength_status: string;
  last_updated: string;
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  [key: string]: number | string;
}

const ImprovementChart = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [performances, setPerformances] = useState<TopicPerformance[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    if (user) {
      fetchPerformanceData();
    }
  }, [user]);

  const fetchPerformanceData = async () => {
    try {
      // Fetch current topic performance with topic names
      const { data: perfData, error: perfError } = await supabase
        .from('user_topic_performance')
        .select(`
          topic_id,
          weakness_score,
          strength_status,
          last_updated,
          topics (name)
        `)
        .eq('user_id', user?.id)
        .order('last_updated', { ascending: true });

      if (perfError) throw perfError;

      const formattedPerf: TopicPerformance[] = (perfData || []).map((p: any) => ({
        topic_id: p.topic_id,
        topic_name: p.topics?.name || 'Unknown Topic',
        weakness_score: p.weakness_score,
        strength_status: p.strength_status,
        last_updated: p.last_updated,
      }));

      setPerformances(formattedPerf);

      // Create chart data - group by date and show weakness score trends
      const groupedByDate: Record<string, Record<string, number>> = {};
      
      formattedPerf.forEach((p) => {
        const date = new Date(p.last_updated).toISOString().split('T')[0];
        if (!groupedByDate[date]) {
          groupedByDate[date] = {};
        }
        groupedByDate[date][p.topic_name] = p.weakness_score;
      });

      // Convert to array format for chart
      const chartPoints: ChartDataPoint[] = Object.entries(groupedByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, topics]) => ({
          date,
          displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ...topics,
        }));

      setChartData(chartPoints);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique topic names for filter
  const topicNames = [...new Set(performances.map((p) => p.topic_name))];

  // Get filtered chart data based on selected topic
  const filteredChartData = chartData.map((point) => {
    if (selectedTopic === 'all') {
      return point;
    }
    return {
      date: point.date,
      displayDate: point.displayDate,
      [selectedTopic]: point[selectedTopic],
    };
  });

  // Calculate overall trend
  const getOverallTrend = () => {
    if (chartData.length < 2) return 'neutral';
    
    const topicsToCheck = selectedTopic === 'all' ? topicNames : [selectedTopic];
    let totalChange = 0;
    let count = 0;

    topicsToCheck.forEach((topic) => {
      const first = chartData.find((d) => d[topic] !== undefined);
      const last = [...chartData].reverse().find((d) => d[topic] !== undefined);
      
      if (first && last && first[topic] !== undefined && last[topic] !== undefined) {
        totalChange += (Number(first[topic]) - Number(last[topic]));
        count++;
      }
    });

    if (count === 0) return 'neutral';
    const avgChange = totalChange / count;
    
    if (avgChange > 5) return 'improving';
    if (avgChange < -5) return 'declining';
    return 'neutral';
  };

  const trend = getOverallTrend();

  // Generate colors for each topic
  const topicColors: Record<string, string> = {};
  const colorPalette = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
  topicNames.forEach((name, index) => {
    topicColors[name] = colorPalette[index % colorPalette.length];
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  if (performances.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No performance data yet.</p>
        <p className="text-sm mt-1">Complete some quizzes to see your improvement trends!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filter and trend indicator */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          {trend === 'improving' && (
            <>
              <TrendingDown className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-500 font-medium">Improving</span>
            </>
          )}
          {trend === 'declining' && (
            <>
              <TrendingUp className="h-5 w-5 text-destructive" />
              <span className="text-sm text-destructive font-medium">Needs Attention</span>
            </>
          )}
          {trend === 'neutral' && (
            <>
              <Minus className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Stable</span>
            </>
          )}
        </div>

        <Select value={selectedTopic} onValueChange={setSelectedTopic}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {topicNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
              label={{ value: 'Weakness Score', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            {selectedTopic === 'all' ? (
              topicNames.map((name) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={topicColors[name]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey={selectedTopic}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            )}
            {selectedTopic === 'all' && topicNames.length > 1 && <Legend />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend / Info */}
      <p className="text-xs text-muted-foreground text-center">
        Lower scores = Better mastery. Track your improvement as you practice!
      </p>

      {/* Current Status Grid */}
      <div className="grid grid-cols-2 gap-2">
        {performances
          .filter((p) => selectedTopic === 'all' || p.topic_name === selectedTopic)
          .slice(-4)
          .map((p) => (
            <Card key={p.topic_id} className="p-3">
              <p className="text-xs text-muted-foreground truncate">{p.topic_name}</p>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-lg font-bold ${
                  p.strength_status === 'strong' ? 'text-green-500' :
                  p.strength_status === 'moderate' ? 'text-yellow-500' :
                  'text-destructive'
                }`}>
                  {p.weakness_score}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  p.strength_status === 'strong' ? 'bg-green-500/20 text-green-500' :
                  p.strength_status === 'moderate' ? 'bg-yellow-500/20 text-yellow-500' :
                  'bg-destructive/20 text-destructive'
                }`}>
                  {p.strength_status}
                </span>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
};

export default ImprovementChart;
