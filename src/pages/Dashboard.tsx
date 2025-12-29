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
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  videoId?: string;
  quizUnlocked?: boolean;
}

interface VideoRec {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  todoId: string;
}

// Mock data
const mockVideoRecs: VideoRec[] = [
  {
    id: 'dQw4w9WgXcQ',
    title: 'Introduction to Machine Learning',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    duration: '12:45',
    todoId: '1',
  },
  {
    id: 'jNQXAC9IVRw',
    title: 'Data Structures Explained',
    thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    duration: '18:30',
    todoId: '2',
  },
  {
    id: '9bZkp7q19f0',
    title: 'Web Development Fundamentals',
    thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg',
    duration: '22:15',
    todoId: '3',
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([
    { id: '1', title: 'Learn Machine Learning basics', completed: false, videoId: 'dQw4w9WgXcQ' },
    { id: '2', title: 'Study Data Structures', completed: true, videoId: 'jNQXAC9IVRw', quizUnlocked: true },
  ]);
  const [newTodo, setNewTodo] = useState('');
  const [showInput, setShowInput] = useState(false);

  const completedCount = todos.filter((t) => t.completed).length;
  const progress = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const newTodoItem: Todo = {
      id: Date.now().toString(),
      title: newTodo,
      completed: false,
      videoId: mockVideoRecs[Math.floor(Math.random() * mockVideoRecs.length)].id,
    };

    setTodos([...todos, newTodoItem]);
    setNewTodo('');
    setShowInput(false);
    toast.success('Task added! AI is finding relevant videos...');
  };

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) => {
        if (todo.id === id) {
          const completed = !todo.completed;
          if (completed) {
            toast.success('Great job! Quiz unlocked!', {
              icon: <Trophy className="h-4 w-4 text-primary" />,
            });
          }
          return { ...todo, completed, quizUnlocked: completed };
        }
        return todo;
      })
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Hi, {user?.name || 'Student'}!
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

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

        {/* Todo List */}
        <section className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Study Tasks
            </h2>
          </div>

          <div className="space-y-3">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`glass-card rounded-xl p-4 transition-all duration-300 ${
                  todo.completed ? 'opacity-70' : 'hover:neon-glow'
                }`}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="flex-shrink-0 transition-transform hover:scale-110"
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground hover:text-primary" />
                    )}
                  </button>
                  <span
                    className={`flex-1 ${
                      todo.completed ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {todo.title}
                  </span>
                  <div className="flex gap-2">
                    {todo.videoId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/video/${todo.id}`)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Watch
                      </Button>
                    )}
                    {todo.quizUnlocked && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => navigate(`/quiz/${todo.id}`)}
                      >
                        <Trophy className="h-4 w-4 mr-1" />
                        Quiz
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {showInput && (
              <form onSubmit={handleAddTodo} className="flex gap-2">
                <Input
                  placeholder="What do you want to learn?"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  autoFocus
                />
                <Button type="submit" variant="neon">
                  Add
                </Button>
              </form>
            )}
          </div>
        </section>

        {/* Video Recommendations */}
        <section className="space-y-4 animate-slide-up">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Recommended Videos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockVideoRecs.map((video) => (
              <div
                key={video.id}
                className="glass-card rounded-xl overflow-hidden group cursor-pointer hover:neon-glow transition-all duration-300"
                onClick={() => navigate(`/video/${video.todoId}`)}
              >
                <div className="relative aspect-video bg-muted">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/320x180/1a1a2e/22d3ee?text=Video';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-background/80 text-xs font-mono">
                    {video.duration}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-4 rounded-full bg-primary/90 neon-glow">
                      <Play className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium line-clamp-2">{video.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* FAB */}
      <Button
        variant="neon"
        size="fab"
        className="fixed bottom-6 right-6 animate-pulse-glow"
        onClick={() => setShowInput(!showInput)}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default Dashboard;
