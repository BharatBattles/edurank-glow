import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Share2,
  CheckCircle,
  Sparkles,
  BookOpen,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Brain,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MicroQuizPopup from '@/components/MicroQuizPopup';

interface ParsedNotes {
  title: string;
  summary: string;
  keyPoints: string[];
  sections: Array<{
    title: string;
    content: string;
  }>;
}

interface WeakTopic {
  topic_id: string;
  topic_name: string;
  weakness_score: number;
}

const Notes = () => {
  const { todoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<ParsedNotes | null>(null);
  const [rawNotes, setRawNotes] = useState<string>('');
  const [todoTitle, setTodoTitle] = useState('');
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [microQuizOpen, setMicroQuizOpen] = useState(false);
  const [selectedQuizTopic, setSelectedQuizTopic] = useState<WeakTopic | null>(null);

  useEffect(() => {
    if (todoId && user) {
      fetchNotes();
      fetchWeakTopics();
    }
  }, [todoId, user]);

  const fetchNotes = async () => {
    try {
      // Fetch todo for title
      const { data: todoData } = await supabase
        .from('todos')
        .select('title')
        .eq('id', todoId)
        .maybeSingle();

      if (todoData) {
        setTodoTitle(todoData.title);
      }

      // Fetch notes
      const { data: notesData, error } = await supabase
        .from('notes')
        .select('content')
        .eq('todo_id', todoId)
        .eq('is_ai_generated', true)
        .maybeSingle();

      if (error) throw error;

      if (notesData?.content) {
        setRawNotes(notesData.content);
        parseNotes(notesData.content, todoData?.title || 'Study Notes');
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeakTopics = async () => {
    try {
      // Fetch user's weak topics with topic names
      const { data, error } = await supabase
        .from('user_topic_performance')
        .select(`
          topic_id,
          weakness_score,
          topics (name)
        `)
        .eq('user_id', user?.id)
        .eq('strength_status', 'weak')
        .order('weakness_score', { ascending: false });

      if (error) throw error;

      const formattedTopics: WeakTopic[] = (data || []).map((t: any) => ({
        topic_id: t.topic_id,
        topic_name: t.topics?.name || 'Unknown',
        weakness_score: t.weakness_score,
      }));

      setWeakTopics(formattedTopics);
    } catch (error) {
      console.error('Error fetching weak topics:', error);
    }
  };

  const parseNotes = (content: string, title: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    const keyPoints: string[] = [];
    const sections: Array<{ title: string; content: string }> = [];
    let currentSection: { title: string; content: string } | null = null;
    let summary = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check for headers
      if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { title: trimmed.replace(/^#+\s*/, ''), content: '' };
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const point = trimmed.replace(/^[-*]\s*/, '').replace(/\*\*/g, '');
        if (point.length > 10) {
          keyPoints.push(point);
        }
        if (currentSection) {
          currentSection.content += point + '\n';
        }
      } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        // Bold line - might be a key point
        const point = trimmed.replace(/\*\*/g, '');
        if (point.length > 10) {
          keyPoints.push(point);
        }
      } else if (!trimmed.startsWith('#') && trimmed.length > 50) {
        if (!summary && !currentSection) {
          summary = trimmed.replace(/\*\*/g, '');
        } else if (currentSection) {
          currentSection.content += trimmed + '\n';
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    // If no summary found, create one from key points
    if (!summary && keyPoints.length > 0) {
      summary = keyPoints[0];
    }

    setNotes({
      title,
      summary: summary || 'Study notes generated from your video content.',
      keyPoints: keyPoints.slice(0, 7),
      sections: sections.slice(0, 5),
    });
  };

  // Check if text contains a weak topic
  const containsWeakTopic = (text: string): WeakTopic | null => {
    const lowerText = text.toLowerCase();
    for (const topic of weakTopics) {
      if (lowerText.includes(topic.topic_name.toLowerCase())) {
        return topic;
      }
    }
    return null;
  };

  // Render text with weak topic highlighting
  const renderHighlightedText = (text: string) => {
    const weakTopic = containsWeakTopic(text);
    
    if (weakTopic) {
      return (
        <div className="relative">
          <div className="absolute -left-3 top-0 bottom-0 w-1 bg-destructive rounded-full" />
          <p className="border-l-2 border-transparent">{text}</p>
          <button
            onClick={() => {
              setSelectedQuizTopic(weakTopic);
              setMicroQuizOpen(true);
            }}
            className="inline-flex items-center gap-1 mt-2 text-xs text-destructive hover:underline"
          >
            <Brain className="h-3 w-3" />
            Practice: {weakTopic.topic_name}
          </button>
        </div>
      );
    }

    return <p>{text}</p>;
  };

  const handleDownload = () => {
    const blob = new Blob([rawNotes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${todoTitle || 'notes'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Notes downloaded!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: notes?.title || 'Study Notes',
        text: notes?.summary || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!notes || !rawNotes) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No notes found for this task</p>
        <p className="text-sm text-muted-foreground">Watch at least 50% of the video to generate notes</p>
        <Button onClick={() => navigate(`/video/${todoId}`)}>Watch Video</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Weak Topics Alert */}
        {weakTopics.length > 0 && (
          <div className="mb-6 p-4 glass-card rounded-xl border border-destructive/30 bg-destructive/5 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-2">Weak Topics Detected</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Sections related to these topics are highlighted. Tap to practice!
                </p>
                <div className="flex flex-wrap gap-2">
                  {weakTopics.slice(0, 5).map((topic) => (
                    <Badge
                      key={topic.topic_id}
                      variant="outline"
                      className="cursor-pointer border-destructive/50 hover:bg-destructive/10"
                      onClick={() => {
                        setSelectedQuizTopic(topic);
                        setMicroQuizOpen(true);
                      }}
                    >
                      <Brain className="h-3 w-3 mr-1" />
                      {topic.topic_name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">AI-Generated Notes</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">{notes.title}</h1>
          <p className="text-lg text-muted-foreground">{notes.summary}</p>
        </div>

        {/* Key Points */}
        {notes.keyPoints.length > 0 && (
          <section className="mb-8 animate-slide-up">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-primary" />
              Key Takeaways
            </h2>
            <div className="space-y-3">
              {notes.keyPoints.map((point, index) => {
                const weakTopic = containsWeakTopic(point);
                
                return (
                  <div
                    key={index}
                    className={`flex gap-3 p-4 glass-card rounded-xl hover:neon-glow transition-all duration-300 ${
                      weakTopic ? 'border-l-4 border-destructive bg-destructive/5' : ''
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      weakTopic ? 'bg-destructive text-destructive-foreground' : 'gradient-bg text-primary-foreground'
                    }`}>
                      {weakTopic ? <AlertTriangle className="h-3 w-3" /> : index + 1}
                    </div>
                    <div className="flex-1">
                      <p>{point}</p>
                      {weakTopic && (
                        <button
                          onClick={() => {
                            setSelectedQuizTopic(weakTopic);
                            setMicroQuizOpen(true);
                          }}
                          className="inline-flex items-center gap-1 mt-2 text-xs text-destructive hover:underline font-medium"
                        >
                          <Brain className="h-3 w-3" />
                          Quick Quiz: {weakTopic.topic_name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Detailed Sections */}
        {notes.sections.length > 0 && (
          <section className="space-y-6 animate-slide-up">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Detailed Notes
            </h2>
            {notes.sections.map((section, index) => {
              const weakTopic = containsWeakTopic(section.title) || containsWeakTopic(section.content);
              
              return (
                <div 
                  key={index} 
                  className={`glass-card rounded-xl p-6 ${
                    weakTopic ? 'border-l-4 border-destructive bg-destructive/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className={`text-lg font-semibold ${weakTopic ? 'text-destructive' : 'neon-text'}`}>
                      {section.title}
                    </h3>
                    {weakTopic && (
                      <Badge variant="outline" className="border-destructive text-destructive text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Weak Area
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </p>
                  {weakTopic && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setSelectedQuizTopic(weakTopic);
                        setMicroQuizOpen(true);
                      }}
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Practice This Topic
                    </Button>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <Button variant="neon" size="lg" onClick={() => navigate(`/quiz/${todoId}`)}>
            <Sparkles className="h-5 w-5 mr-2" />
            Take the Quiz
          </Button>
        </div>
      </main>

      {/* Micro Quiz Popup */}
      <MicroQuizPopup
        isOpen={microQuizOpen}
        onClose={() => {
          setMicroQuizOpen(false);
          setSelectedQuizTopic(null);
        }}
        topicName={selectedQuizTopic?.topic_name || ''}
        topicId={selectedQuizTopic?.topic_id || ''}
        todoId={todoId || ''}
      />
    </div>
  );
};

export default Notes;
