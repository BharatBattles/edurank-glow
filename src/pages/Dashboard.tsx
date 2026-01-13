import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  CheckCircle2,
  Circle,
  Play,
  BookOpen,
  Trophy,
  LogOut,
  Sparkles,
  TrendingUp,
  Loader2,
  Link as LinkIcon,
  Trash2,
  Search,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useRateLimiter } from '@/hooks/useRateLimiter';
import WeakTopicCards from '@/components/WeakTopicCards';
import XpLevelBar from '@/components/header/XpLevelBar';
import StreakDisplay from '@/components/header/StreakDisplay';
import StreakProtectionModal from '@/components/header/StreakProtectionModal';
import { useUserStats } from '@/hooks/useUserStats';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  video_id: string | null;
  video_url: string | null;
  description: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { canMakeRequest, isRateLimited } = useRateLimiter();
  const { stats, useStreakProtection } = useUserStats();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [streakModalOpen, setStreakModalOpen] = useState(false);

  const completedCount = todos.filter((t) => t.completed).length;
  const progress = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;

  const displayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    if (user) {
      fetchTodos();
    }
  }, [user]);

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim() || !user) return;

    // Check rate limit and credits before proceeding
    const canProceed = await canMakeRequest();
    if (!canProceed) {
      return;
    }

    setAdding(true);
    
    try {
      // First, use AI to find the best video for this topic
      toast.info('Finding the best video for your topic...', {
        icon: <Search className="h-4 w-4 text-primary animate-pulse" />,
      });

      let videoId: string | null = null;
      let videoDescription: string | null = null;
      let subtasksData: any[] = [];

      try {
        const { data: videoData, error: videoError } = await supabase.functions.invoke('find-video', {
          body: { topic: newTodoTitle.trim() },
        });

        if (!videoError && videoData && !videoData.error) {
          videoId = videoData.videoId;
          videoDescription = `${videoData.title} by ${videoData.channel} - ${videoData.reason}`;
          subtasksData = videoData.subtasks || [];
        }
      } catch (aiError) {
        console.error('AI video search failed:', aiError);
        // Continue without video if AI fails
      }

      const { data, error } = await supabase
        .from('todos')
        .insert({
          title: newTodoTitle.trim(),
          video_id: videoId,
          description: videoDescription,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Save subtasks and their videos to the database
      if (data && subtasksData.length > 0) {
        for (let i = 0; i < subtasksData.length; i++) {
          const subtask = subtasksData[i];
          
          // Insert subtask
          const { data: subtaskRow, error: subtaskError } = await supabase
            .from('subtasks')
            .insert({
              todo_id: data.id,
              user_id: user.id,
              title: subtask.title,
              order_index: i,
            })
            .select()
            .single();

          if (subtaskError) {
            console.error('Error saving subtask:', subtaskError);
            continue;
          }

          // Insert videos for this subtask
          if (subtaskRow && subtask.videos?.length > 0) {
            const videosToInsert = subtask.videos.map((video: any, idx: number) => ({
              subtask_id: subtaskRow.id,
              user_id: user.id,
              video_id: video.videoId,
              title: video.title,
              channel: video.channel,
              engagement_score: video.engagementScore,
              reason: video.reason,
              order_index: idx,
            }));

            const { error: videosError } = await supabase
              .from('subtask_videos')
              .insert(videosToInsert);

            if (videosError) {
              console.error('Error saving subtask videos:', videosError);
            }
          }
        }
      }

      setTodos([data, ...todos]);
      setNewTodoTitle('');
      setShowInput(false);
      
      if (videoId) {
        toast.success('Task added with AI-recommended video!', {
          icon: <Sparkles className="h-4 w-4 text-primary" />,
        });
      } else {
        toast.success('Task added!');
      }
    } catch (error) {
      console.error('Error adding todo:', error);
      toast.error('Failed to add task');
    } finally {
      setAdding(false);
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed: !todo.completed })
        .eq('id', id);

      if (error) throw error;

      setTodos(
        todos.map((t) => {
          if (t.id === id) {
            const completed = !t.completed;
            if (completed) {
              toast.success('Great job! Quiz unlocked!', {
                icon: <Trophy className="h-4 w-4 text-primary" />,
              });
            }
            return { ...t, completed };
          }
          return t;
        })
      );
    } catch (error) {
      console.error('Error updating todo:', error);
      toast.error('Failed to update task');
    }
  };

  const deleteTodo = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTodos(todos.filter((t) => t.id !== id));
      toast.success('Task deleted');
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete task');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
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
          
          {/* XP Bar and Streak Display */}
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
                  onStreakClick={() => setStreakModalOpen(true)}
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

      {/* Streak Protection Modal */}
      {stats && (
        <StreakProtectionModal
          open={streakModalOpen}
          onOpenChange={setStreakModalOpen}
          currentStreak={stats.currentStreak}
          streakProtections={stats.streakProtections}
          onUseProtection={useStreakProtection}
        />
      )}

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Progress Section */}
        <section className="glass-card rounded-2xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Your Progress</h2>
                <p className="text-sm text-muted-foreground">
                  {completedCount} of {todos.length} tasks completed
                </p>
              </div>
            </div>
            <span className="text-2xl font-bold neon-text">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </section>

        {/* Weak Topic Recommendations */}
        <WeakTopicCards />

        {/* Todo List */}
        <section className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Study Tasks
            </h2>
          </div>

          <div className="space-y-3">
            {todos.length === 0 && !showInput && (
              <div className="glass-card rounded-xl p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No study tasks yet.</p>
                <p className="text-sm text-muted-foreground">Add a topic and AI will find the best video for you!</p>
              </div>
            )}

            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`glass-card rounded-xl p-4 transition-all duration-300 ${
                  todo.completed ? 'opacity-70' : 'hover:neon-glow'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="flex-shrink-0 transition-transform hover:scale-110 mt-1"
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground hover:text-primary" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`block font-medium ${
                        todo.completed ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {todo.title}
                    </span>
                    {todo.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {todo.description}
                      </p>
                    )}
                    {todo.video_id && (
                      <span className="text-xs text-primary flex items-center gap-1 mt-2">
                        <Sparkles className="h-3 w-3" />
                        AI-recommended video attached
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {todo.video_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/video/${todo.id}`)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Watch
                      </Button>
                    )}
                    {todo.completed && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => navigate(`/quiz/${todo.id}`)}
                      >
                        <Trophy className="h-4 w-4 mr-1" />
                        Quiz
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTodo(todo.id)}
                      disabled={deletingId === todo.id}
                    >
                      {deletingId === todo.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {showInput && (
              <form onSubmit={handleAddTodo} className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI will find the best video for your topic
                </div>
                <Input
                  placeholder="What do you want to learn? (e.g., Machine Learning basics)"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit" variant="neon" disabled={adding || !newTodoTitle.trim()}>
                    {adding ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Finding video...
                      </>
                    ) : (
                      'Add Task'
                    )}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowInput(false)} disabled={adding}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* FAB */}
      {!showInput && (
        <Button
          variant="neon"
          size="fab"
          className="fixed bottom-6 right-6 animate-pulse-glow"
          onClick={() => setShowInput(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default Dashboard;
