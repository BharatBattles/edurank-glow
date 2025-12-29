import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  X,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

// Mock notes data
const mockNotes = [
  'Machine Learning is a subset of AI that enables systems to learn from data',
  'Key concepts: supervised learning, unsupervised learning, reinforcement learning',
  'Common algorithms: linear regression, decision trees, neural networks',
  'Training data is crucial for model accuracy',
  'Overfitting occurs when a model learns noise instead of patterns',
  'Cross-validation helps prevent overfitting',
  'Feature engineering improves model performance',
];

const VideoPlayer = () => {
  const { todoId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [progress, setProgress] = useState(0);
  const [showNotesButton, setShowNotesButton] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);

  // Mock video ID - in real app, fetch based on todoId
  const videoId = 'dQw4w9WgXcQ';

  useEffect(() => {
    // Progress tracker
    const interval = setInterval(() => {
      if (player) {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        if (duration > 0) {
          const currentProgress = (currentTime / duration) * 100;
          setProgress(currentProgress);

          if (currentProgress >= 50 && !showNotesButton) {
            setShowNotesButton(true);
            toast.success('AI Notes available!', {
              icon: <Sparkles className="h-4 w-4 text-primary" />,
            });
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player, showNotesButton]);

  const onReady = (event: YouTubeEvent) => {
    setPlayer(event.target);
  };

  const handleGenerateNotes = async () => {
    setIsGeneratingNotes(true);
    setShowNotes(true);

    // Simulate AI note generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setNotes(mockNotes);
    setIsGeneratingNotes(false);
    toast.success('Notes generated successfully!');
  };

  const opts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
    },
  };

  return (
    <div className="min-h-screen flex flex-col">
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
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% watched
            </span>
            {showNotesButton && (
              <Button variant="neon" size="sm" onClick={handleGenerateNotes}>
                <Sparkles className="h-4 w-4 mr-1" />
                AI Notes
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Video Container */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Video Player */}
        <div className="flex-1 bg-background">
          <div className="aspect-video w-full max-w-5xl mx-auto">
            <YouTube
              videoId={videoId}
              opts={opts}
              onReady={onReady}
              className="w-full h-full"
              iframeClassName="w-full h-full rounded-lg"
            />
          </div>

          {/* Progress Bar */}
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full gradient-bg transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Video Info */}
          <div className="max-w-5xl mx-auto px-4 pb-8">
            <h1 className="text-2xl font-bold mb-2">Introduction to Machine Learning</h1>
            <p className="text-muted-foreground">
              Learn the fundamentals of machine learning and how AI systems learn from data.
            </p>

            <div className="mt-6 flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/notes/${todoId}`)}
                disabled={notes.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Full Notes
              </Button>
            </div>
          </div>
        </div>

        {/* Notes Sidebar */}
        {showNotes && (
          <div className="lg:w-96 glass-card border-l border-border/50 animate-slide-up lg:animate-none">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI-Generated Notes
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNotes(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] lg:max-h-[calc(100vh-200px)] overflow-y-auto">
              {isGeneratingNotes ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Generating AI notes...</p>
                </div>
              ) : (
                notes.map((note, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-3 rounded-lg bg-muted/50 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{note}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
