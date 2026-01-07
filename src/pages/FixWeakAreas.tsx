import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Trophy,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Loader2,
  AlertCircle,
  Lightbulb,
  Target,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Question {
  id: number;
  topicId: string;
  topicName: string;
  difficulty: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface WeakTopic {
  id: string;
  topicId: string;
  topicName: string;
  weaknessScore: number;
  todoId?: string;
  notes?: string;
}

const FixWeakAreas = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [topicScores, setTopicScores] = useState<Record<string, { correct: number; total: number }>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  useEffect(() => {
    if (user) {
      fetchWeakTopicsAndGenerateQuiz();
    }
  }, [user]);

  const fetchWeakTopicsAndGenerateQuiz = async () => {
    try {
      // Get weak topics
      const { data: performanceData, error: perfError } = await supabase
        .from('user_topic_performance')
        .select(`
          id,
          topic_id,
          weakness_score,
          strength_status
        `)
        .in('strength_status', ['weak', 'moderate'])
        .order('weakness_score', { ascending: false })
        .limit(5);

      if (perfError) throw perfError;

      if (!performanceData || performanceData.length === 0) {
        toast.info('No weak topics found. Great job!');
        setLoading(false);
        return;
      }

      // Get topic details
      const topicIds = performanceData.map(p => p.topic_id);
      const { data: topicsData } = await supabase
        .from('topics')
        .select('id, name')
        .in('id', topicIds);

      const topicMap = new Map(topicsData?.map(t => [t.id, t.name]) || []);

      // Get related todos with notes for each weak topic
      const { data: analysisData } = await supabase
        .from('video_topic_analysis')
        .select('topic_id, todo_id')
        .in('topic_id', topicIds)
        .eq('is_weak_topic', true)
        .limit(10);

      const todoIds = [...new Set(analysisData?.map(a => a.todo_id) || [])];
      
      let notesMap = new Map<string, string>();
      if (todoIds.length > 0) {
        const { data: notesData } = await supabase
          .from('notes')
          .select('todo_id, content')
          .in('todo_id', todoIds)
          .eq('is_ai_generated', true);
        
        notesData?.forEach(n => {
          notesMap.set(n.todo_id, n.content);
        });
      }

      const topics: WeakTopic[] = performanceData.map(p => {
        const analysis = analysisData?.find(a => a.topic_id === p.topic_id);
        return {
          id: p.id,
          topicId: p.topic_id,
          topicName: topicMap.get(p.topic_id) || 'Unknown Topic',
          weaknessScore: Number(p.weakness_score),
          todoId: analysis?.todo_id,
          notes: analysis?.todo_id ? notesMap.get(analysis.todo_id) : undefined,
        };
      });

      setWeakTopics(topics);

      // Generate targeted questions for weak topics
      await generateWeakTopicQuestions(topics);
    } catch (error) {
      console.error('Error fetching weak topics:', error);
      toast.error('Failed to load weak topics');
    } finally {
      setLoading(false);
    }
  };

  const generateWeakTopicQuestions = async (topics: WeakTopic[]) => {
    setGenerating(true);
    
    try {
      // Combine notes from different topics
      const notesContent = topics
        .filter(t => t.notes)
        .map(t => `## ${t.topicName}\n${t.notes}`)
        .join('\n\n---\n\n');

      if (!notesContent) {
        // Generate questions based on topic names only
        const topicsList = topics.map(t => t.topicName).join(', ');
        
        const { data, error } = await supabase.functions.invoke('fix-weak-areas-quiz', {
          body: {
            topics: topics.map(t => ({ name: t.topicName, weaknessScore: t.weaknessScore })),
            questionsPerTopic: 2,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        const quizQuestions = (data.questions || []).map((q: any, i: number) => ({
          ...q,
          id: i + 1,
        }));

        setQuestions(quizQuestions);
        setQuestionStartTime(Date.now());
        return;
      }

      // Use notes to generate targeted questions
      const { data, error } = await supabase.functions.invoke('fix-weak-areas-quiz', {
        body: {
          topics: topics.map(t => ({ name: t.topicName, weaknessScore: t.weaknessScore })),
          notes: notesContent,
          questionsPerTopic: 2,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const quizQuestions = (data.questions || []).map((q: any, i: number) => ({
        ...q,
        id: i + 1,
      }));

      setQuestions(quizQuestions);
      setQuestionStartTime(Date.now());
    } catch (error: any) {
      console.error('Error generating questions:', error);
      
      if (error.message?.includes('429')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('402')) {
        toast.error('Please add credits to continue.');
      } else {
        toast.error('Failed to generate practice questions');
      }
    } finally {
      setGenerating(false);
    }
  };

  const question = questions[currentQuestion];
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const handleSelectAnswer = (index: number) => {
    if (!isSubmitted) {
      setSelectedAnswer(index);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      toast.error('Please select an answer');
      return;
    }

    setIsSubmitted(true);
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);

    const isCorrect = selectedAnswer === question.correctAnswer;
    
    // Track per-topic score
    setTopicScores(prev => {
      const topicId = question.topicId || 'unknown';
      const current = prev[topicId] || { correct: 0, total: 0 };
      return {
        ...prev,
        [topicId]: {
          correct: current.correct + (isCorrect ? 1 : 0),
          total: current.total + 1,
        },
      };
    });

    if (isCorrect) {
      toast.success('Correct! You\'re improving!');
    } else {
      toast.error('Not quite, but keep going!');
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
      setQuestionStartTime(Date.now());
    } else {
      saveProgress();
      setShowResult(true);
    }
  };

  const saveProgress = async () => {
    // Mark recommendations as completed
    const completedTopicIds = Object.keys(topicScores);
    
    if (completedTopicIds.length > 0) {
      try {
        await supabase
          .from('recommendation_queue')
          .update({ is_completed: true })
          .in('topic_id', completedTopicIds);
      } catch (error) {
        console.error('Error updating recommendations:', error);
      }
    }
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer, index) => {
      if (answer === questions[index]?.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setShowResult(false);
    setIsSubmitted(false);
    setTopicScores({});
    setQuestionStartTime(Date.now());
  };

  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'easy': return 'bg-success/20 text-success border-success/30';
      case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground">
          {generating ? 'Creating targeted practice questions...' : 'Analyzing your weak areas...'}
        </p>
      </div>
    );
  }

  if (weakTopics.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Trophy className="h-12 w-12 text-success" />
        <h1 className="text-2xl font-bold">You're Doing Great!</h1>
        <p className="text-muted-foreground text-center max-w-md">
          No weak areas detected. Keep taking quizzes to identify areas for improvement.
        </p>
        <Button variant="neon" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Could not generate practice questions</p>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const score = calculateScore();
  const percentage = questions.length > 0 ? (score / questions.length) * 100 : 0;
  const isPassing = percentage >= 60;

  if (showResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg text-center animate-slide-up">
          <div className={`glass-card rounded-2xl p-8 ${isPassing ? 'neon-glow' : ''}`}>
            <div
              className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                isPassing ? 'gradient-bg' : 'bg-primary/20'
              }`}
            >
              {isPassing ? (
                <TrendingUp className="h-10 w-10 text-primary-foreground" />
              ) : (
                <Target className="h-10 w-10 text-primary" />
              )}
            </div>

            <h1 className="text-3xl font-bold mb-2">
              {isPassing ? 'Great Improvement!' : 'Keep Practicing!'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {isPassing
                ? 'You\'re getting stronger in your weak areas!'
                : 'Every practice session makes you better.'}
            </p>

            <div className="text-5xl font-bold neon-text mb-2">
              {score}/{questions.length}
            </div>
            <p className="text-muted-foreground mb-6">{Math.round(percentage)}% correct</p>

            {/* Per-topic breakdown */}
            <div className="space-y-2 mb-6 text-left">
              <p className="text-sm font-medium text-muted-foreground mb-2">Topic Progress:</p>
              {weakTopics.map(topic => {
                const topicScore = topicScores[topic.topicId];
                if (!topicScore) return null;
                const topicPercent = Math.round((topicScore.correct / topicScore.total) * 100);
                return (
                  <div key={topic.topicId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm">{topic.topicName}</span>
                    <Badge variant={topicPercent >= 50 ? 'default' : 'destructive'}>
                      {topicScore.correct}/{topicScore.total}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={resetQuiz}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Practice Again
              </Button>
              <Button variant="neon" className="flex-1" onClick={() => navigate('/dashboard')}>
                Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Logo size="sm" />
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="destructive" className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Fix Weak Areas
              </Badge>
              <span className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="animate-fade-in">
          {/* Topic badge */}
          {question.topicName && (
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="outline" className="bg-destructive/10 border-destructive/30">
                <Zap className="h-3 w-3 mr-1" />
                {question.topicName}
              </Badge>
            </div>
          )}

          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Targeted Practice</span>
              </div>
              {question.difficulty && (
                <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                  {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-semibold">{question.question}</h2>
          </div>

          <div className="space-y-3 mb-6">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === question.correctAnswer;
              const showCorrect = isSubmitted && isCorrect;
              const showWrong = isSubmitted && isSelected && !isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={isSubmitted}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-300 ${
                    showCorrect
                      ? 'bg-success/20 border-2 border-success'
                      : showWrong
                      ? 'bg-destructive/20 border-2 border-destructive'
                      : isSelected
                      ? 'glass-card neon-border'
                      : 'glass-card hover:neon-glow border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        showCorrect
                          ? 'bg-success text-success-foreground'
                          : showWrong
                          ? 'bg-destructive text-destructive-foreground'
                          : isSelected
                          ? 'gradient-bg text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {showCorrect ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : showWrong ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </div>
                    <span>{option}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {isSubmitted && question.explanation && (
            <div className="glass-card rounded-xl p-4 mb-6 border border-primary/30 bg-primary/5">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-primary mb-1">Explanation</p>
                  <p className="text-sm text-muted-foreground">{question.explanation}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            {!isSubmitted ? (
              <Button
                variant="neon"
                size="lg"
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
              >
                Submit Answer
              </Button>
            ) : (
              <Button variant="neon" size="lg" onClick={handleNextQuestion}>
                {currentQuestion < questions.length - 1 ? (
                  <>
                    Next Question
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    See Results
                    <Trophy className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FixWeakAreas;
