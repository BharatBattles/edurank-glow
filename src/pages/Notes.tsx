import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Share2,
  CheckCircle,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

// Mock notes data
const mockNotes = {
  title: 'Introduction to Machine Learning',
  summary:
    'This video covers the fundamental concepts of machine learning, including different learning paradigms and common algorithms used in the field.',
  keyPoints: [
    'Machine Learning is a subset of AI that enables systems to learn from data',
    'Key concepts: supervised learning, unsupervised learning, reinforcement learning',
    'Common algorithms: linear regression, decision trees, neural networks',
    'Training data is crucial for model accuracy',
    'Overfitting occurs when a model learns noise instead of patterns',
    'Cross-validation helps prevent overfitting',
    'Feature engineering improves model performance',
  ],
  sections: [
    {
      title: 'What is Machine Learning?',
      content:
        'Machine learning is a branch of artificial intelligence that focuses on building systems that can learn from and make decisions based on data. Instead of being explicitly programmed, these systems improve their performance through experience.',
    },
    {
      title: 'Types of Learning',
      content:
        'There are three main types of machine learning: Supervised Learning (labeled data), Unsupervised Learning (unlabeled data), and Reinforcement Learning (learning through rewards and penalties).',
    },
    {
      title: 'Common Algorithms',
      content:
        'Popular algorithms include Linear Regression for continuous predictions, Decision Trees for classification, and Neural Networks for complex pattern recognition.',
    },
  ],
};

const Notes = () => {
  const { todoId } = useParams();
  const navigate = useNavigate();

  const handleDownload = () => {
    // In real app, generate PDF or text file
    toast.success('Notes downloaded!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: mockNotes.title,
        text: mockNotes.summary,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

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
        {/* Title */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">AI-Generated Notes</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">{mockNotes.title}</h1>
          <p className="text-lg text-muted-foreground">{mockNotes.summary}</p>
        </div>

        {/* Key Points */}
        <section className="mb-8 animate-slide-up">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-primary" />
            Key Takeaways
          </h2>
          <div className="space-y-3">
            {mockNotes.keyPoints.map((point, index) => (
              <div
                key={index}
                className="flex gap-3 p-4 glass-card rounded-xl hover:neon-glow transition-all duration-300"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <p>{point}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Sections */}
        <section className="space-y-6 animate-slide-up">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Detailed Notes
          </h2>
          {mockNotes.sections.map((section, index) => (
            <div key={index} className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 neon-text">{section.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{section.content}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Button variant="neon" size="lg" onClick={() => navigate(`/quiz/${todoId}`)}>
            <Sparkles className="h-5 w-5 mr-2" />
            Take the Quiz
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Notes;
