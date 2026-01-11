import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  TrendingDown,
  Zap,
  ArrowRight,
  X,
  Clock,
  Target,
  Sparkles,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import VideoPlayerDialog from './VideoPlayerDialog';

interface WeakTopic {
  id: string;
  topicId: string;
  topicName: string;
  weaknessScore: number;
  strengthStatus: string;
  accuracy: number;
  todoId?: string;
  todoTitle?: string;
}

interface Recommendation {
  id: string;
  topicId: string;
  todoId: string | null;
  type: string;
  title: string;
  description: string;
  priority: number;
  weaknessScore: number;
  videoId: string | null;
  videoTitle: string | null;
  videoChannel: string | null;
}

const WeakTopicCards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [selectedVideo, setSelectedVideo] = useState<{
    videoId: string;
    videoTitle?: string;
    videoChannel?: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      fetchWeakTopics();
    }
  }, [user]);

  const fetchWeakTopics = async () => {
    try {
      // Fetch weak topics with low accuracy
      const { data: performanceData, error: perfError } = await supabase
        .from('user_topic_performance')
        .select(`
          id,
          topic_id,
          weakness_score,
          strength_status,
          correct_answers,
          total_questions
        `)
        .in('strength_status', ['weak', 'moderate'])
        .order('weakness_score', { ascending: false })
        .limit(5);

      if (perfError) {
        console.error('Error fetching performance:', perfError);
      }

      // Get topic names
      if (performanceData && performanceData.length > 0) {
        const topicIds = performanceData.map(p => p.topic_id);
        const { data: topicsData } = await supabase
          .from('topics')
          .select('id, name')
          .in('id', topicIds);

        const topicMap = new Map(topicsData?.map(t => [t.id, t.name]) || []);

        const topics: WeakTopic[] = performanceData.map(p => ({
          id: p.id,
          topicId: p.topic_id,
          topicName: topicMap.get(p.topic_id) || 'Unknown Topic',
          weaknessScore: Number(p.weakness_score),
          strengthStatus: p.strength_status,
          accuracy: p.total_questions > 0 
            ? Math.round((p.correct_answers / p.total_questions) * 100) 
            : 0,
        }));

        setWeakTopics(topics);
      }

      // Fetch recommendations
      const { data: recData, error: recError } = await supabase
        .from('recommendation_queue')
        .select(`
          id,
          topic_id,
          todo_id,
          recommendation_type,
          title,
          description,
          priority,
          weakness_score,
          video_id,
          video_title,
          video_channel
        `)
        .eq('is_dismissed', false)
        .eq('is_completed', false)
        .order('priority', { ascending: false })
        .limit(3);

      if (recError) {
        console.error('Error fetching recommendations:', recError);
      }

      if (recData) {
        const recs: Recommendation[] = recData.map(r => ({
          id: r.id,
          topicId: r.topic_id,
          todoId: r.todo_id,
          type: r.recommendation_type,
          title: r.title,
          description: r.description || '',
          priority: r.priority,
          weaknessScore: Number(r.weakness_score) || 0,
          videoId: r.video_id,
          videoTitle: r.video_title,
          videoChannel: r.video_channel,
        }));
        setRecommendations(recs);
      }
    } catch (error) {
      console.error('Error fetching weak topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissRecommendation = async (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    
    try {
      await supabase
        .from('recommendation_queue')
        .update({ is_dismissed: true })
        .eq('id', id);
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
    }
  };

  const handleFixWeakAreas = () => {
    navigate('/fix-weak-areas');
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-destructive';
    if (score >= 40) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return 'text-success';
    if (accuracy >= 50) return 'text-warning';
    return 'text-destructive';
  };

  if (loading) {
    return null;
  }

  // Don't show if no weak topics or recommendations
  if (weakTopics.length === 0 && recommendations.length === 0) {
    return null;
  }

  const visibleRecommendations = recommendations.filter(r => !dismissedIds.has(r.id));

  return (
    <section className="space-y-4 animate-fade-in">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Target className="h-5 w-5 text-destructive" />
          Improve Your Weak Areas
        </h2>
        {weakTopics.length > 0 && (
          <Button variant="neon" size="sm" onClick={handleFixWeakAreas}>
            <Zap className="h-4 w-4 mr-1" />
            Fix All
          </Button>
        )}
      </div>

      {/* Recommendation Cards */}
      {visibleRecommendations.length > 0 && (
        <div className="space-y-3">
          {visibleRecommendations.map((rec) => (
            <div
              key={rec.id}
              className="glass-card rounded-xl p-4 border-l-4 border-l-destructive/70 hover:neon-glow transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <span className="font-medium">{rec.title}</span>
                    <Badge variant="destructive" className="text-xs">
                      {Math.round(rec.weaknessScore)}% weak
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {rec.videoId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedVideo({
                        videoId: rec.videoId!,
                        videoTitle: rec.videoTitle || undefined,
                        videoChannel: rec.videoChannel || undefined,
                      })}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Watch
                    </Button>
                  )}
                  <Button
                    variant="neon"
                    size="sm"
                    onClick={() => rec.todoId && navigate(`/quiz/${rec.todoId}`)}
                    disabled={!rec.todoId}
                  >
                    Fix Now
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => dismissRecommendation(rec.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Weak Topics Summary */}
      {weakTopics.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Topics blocking your growth
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {weakTopics.slice(0, 5).map((topic) => (
              <div
                key={topic.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20"
              >
                <span className="text-sm font-medium">{topic.topicName}</span>
                <span className={`text-xs ${getAccuracyColor(topic.accuracy)}`}>
                  {topic.accuracy}%
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Focused practice can improve these in just 5-10 minutes each
          </p>
        </div>
      )}

      {/* Motivational CTA */}
      {weakTopics.some(t => t.strengthStatus === 'weak') && (
        <div className="glass-card rounded-xl p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Beat your weakness, climb the leaderboard!</p>
              <p className="text-sm text-muted-foreground">
                This concept is blocking your rank growth. Fix it now!
              </p>
            </div>
            <Button variant="neon" onClick={handleFixWeakAreas}>
              Start
            </Button>
          </div>
        </div>
      )}
      {/* Video Player Dialog */}
      <VideoPlayerDialog
        open={!!selectedVideo}
        onOpenChange={(open) => !open && setSelectedVideo(null)}
        videoId={selectedVideo?.videoId || ''}
        videoTitle={selectedVideo?.videoTitle}
        videoChannel={selectedVideo?.videoChannel}
      />
    </section>
  );
};

export default WeakTopicCards;
