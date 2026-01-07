import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Brain,
  Zap,
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
  type?: string;
  difficulty?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuestionTiming {
  questionIndex: number;
  startTime: number;
  endTime?: number;
  timeTakenSeconds: number;
}

const Quiz = () => {
  const { quizId } = useParams();
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
  const [noNotes, setNoNotes] = useState(false);
  const [notes, setNotes] = useState<string>('');
  const [adaptiveMode, setAdaptiveMode] = useState(false);
  const [currentDifficulty, setCurrentDifficulty] = useState<string>('medium');
  const [generatingAdaptive, setGeneratingAdaptive] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [questionTimings, setQuestionTimings] = useState<QuestionTiming[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  useEffect(() => {
    if (quizId && user) {
      fetchOrGenerateQuiz();
    }
  }, [quizId, user]);

  const fetchOrGenerateQuiz = async () => {
    try {
      // Get video_id from todo
      const { data: todoData } = await supabase
        .from('todos')
        .select('video_id')
        .eq('id', quizId)
        .maybeSingle();
      
      if (todoData?.video_id) {
        setVideoId(todoData.video_id);
      }

      const { data: existingQuiz } = await supabase
        .from('quizzes')
        .select('id, questions')
        .eq('todo_id', quizId)
        .maybeSingle();

      if (existingQuiz?.questions) {
        const parsedQuestions = existingQuiz.questions as unknown as Question[];
        setQuestions(parsedQuestions);
        setSavedQuizId(existingQuiz.id);
        setQuestionStartTime(Date.now());
        setLoading(false);
        return;
      }

      const { data: notesData } = await supabase
        .from('notes')
        .select('content')
        .eq('todo_id', quizId)
        .eq('is_ai_generated', true)
        .maybeSingle();

      if (!notesData?.content) {
        setNoNotes(true);
        setLoading(false);
        return;
      }

      setNotes(notesData.content);
      setGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: {
          todoId: quizId,
          notes: notesData.content,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setQuestions(data.quiz || []);
      if (data.quizId) {
        setSavedQuizId(data.quizId);
      }
      setQuestionStartTime(Date.now());
    } catch (error: any) {
      console.error('Error fetching quiz:', error);
      
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('402')) {
        toast.error('Please add credits to continue using AI features.');
      } else {
        toast.error('Failed to generate quiz');
      }
    } finally {
      setLoading(false);
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

    // Record time taken for this question
    const endTime = Date.now();
    const timeTakenSeconds = (endTime - questionStartTime) / 1000;
    
    setQuestionTimings(prev => [...prev, {
      questionIndex: currentQuestion,
      startTime: questionStartTime,
      endTime,
      timeTakenSeconds: Math.round(timeTakenSeconds * 10) / 10, // Round to 1 decimal
    }]);

    setIsSubmitted(true);
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);

    const isCorrect = selectedAnswer === question.correctAnswer;
    if (isCorrect) {
      toast.success('Correct!');
    } else {
      toast.error('Not quite right');
    }
  };

  const generateAdaptiveQuestion = async (wasCorrect: boolean) => {
    if (!notes || !question) return null;

    setGeneratingAdaptive(true);
    try {
      const { data, error } = await supabase.functions.invoke('adaptive-question', {
        body: {
          notes,
          previousQuestion: question.question,
          wasCorrect,
          difficulty: currentDifficulty,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setCurrentDifficulty(data.difficulty);
      return data.question as Question;
    } catch (error) {
      console.error('Error generating adaptive question:', error);
      return null;
    } finally {
      setGeneratingAdaptive(false);
    }
  };

  const handleNextQuestion = async () => {
    const wasCorrect = selectedAnswer === question.correctAnswer;

    if (adaptiveMode && notes) {
      const adaptiveQuestion = await generateAdaptiveQuestion(wasCorrect);
      if (adaptiveQuestion) {
        adaptiveQuestion.id = questions.length + 1;
        setQuestions([...questions, adaptiveQuestion]);
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setIsSubmitted(false);
        setQuestionStartTime(Date.now()); // Reset timer for new question
        return;
      }
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
      setQuestionStartTime(Date.now()); // Reset timer for next question
    } else {
      await saveResults();
      setShowResult(true);
    }
  };

  const saveResults = async () => {
    if (!user || !quizId) return;

    const score = calculateScore();
    const percentage = (score / questions.length) * 100;

    try {
      await supabase.from('quiz_results').insert({
        user_id: user.id,
        todo_id: quizId,
        score: percentage,
        correct_answers: score,
        total_questions: questions.length,
        answers: answers,
      });

      // Analyze weakness after saving results
      if (videoId && savedQuizId) {
        const questionAttempts = questions.map((q, index) => ({
          questionText: q.question,
          isCorrect: answers[index] === q.correctAnswer,
          timeTakenSeconds: questionTimings[index]?.timeTakenSeconds || 0,
          difficulty: q.difficulty || 'medium',
        }));

        try {
          const { data, error } = await supabase.functions.invoke('analyze-weakness', {
            body: {
              todoId: quizId,
              videoId,
              quizId: savedQuizId,
              questions: questionAttempts,
            },
          });

          if (error) {
            console.error('Weakness analysis error:', error);
          } else if (data?.weakTopics?.length > 0) {
            toast.info(`Found ${data.weakTopics.length} topic(s) to improve`, {
              icon: <AlertCircle className="h-4 w-4 text-primary" />,
            });
          }
        } catch (analysisError) {
          console.error('Weakness analysis failed:', analysisError);
        }
      }
    } catch (error) {
      console.error('Error saving results:', error);
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
    setAdaptiveMode(false);
    setCurrentDifficulty('medium');
  };

  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'easy': return 'bg-success/20 text-success border-success/30';
      case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'concept_check': return <Lightbulb className="h-4 w-4" />;
      case 'mechanism_check': return <Brain className="h-4 w-4" />;
      case 'application_check': return <Zap className="h-4 w-4" />;
      case 'misconception_trap': return <AlertCircle className="h-4 w-4" />;
      case 'why_question': return <Sparkles className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'concept_check': return 'Concept Check';
      case 'mechanism_check': return 'How It Works';
      case 'application_check': return 'Real-World Application';
      case 'misconception_trap': return 'Common Misconception';
      case 'why_question': return 'Understanding Why';
      case 'adaptive': return 'Adaptive Question';
      default: return 'Question';
    }
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground">
          {generating ? 'Generating conceptual quiz questions...' : 'Loading quiz...'}
        </p>
      </div>
    );
  }

  if (noNotes) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No notes found for this task</p>
        <p className="text-sm text-muted-foreground">Generate notes first by watching the video</p>
        <Button onClick={() => navigate(`/video/${quizId}`)}>Watch Video</Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Could not generate quiz questions</p>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const score = calculateScore();
  const percentage = (score / questions.length) * 100;
  const isPassing = percentage >= 60;

  if (showResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg text-center animate-slide-up">
          <div
            className={`glass-card rounded-2xl p-8 ${isPassing ? 'neon-glow' : ''}`}
          >
            <div
              className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                isPassing ? 'gradient-bg' : 'bg-destructive/20'
              }`}
            >
              {isPassing ? (
                <Trophy className="h-10 w-10 text-primary-foreground" />
              ) : (
                <XCircle className="h-10 w-10 text-destructive" />
              )}
            </div>

            <h1 className="text-3xl font-bold mb-2">
              {isPassing ? 'Congratulations!' : 'Keep Learning!'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {isPassing
                ? "You've demonstrated strong conceptual understanding!"
                : "Review the explanations to strengthen your understanding."}
            </p>

            <div className="text-5xl font-bold neon-text mb-2">
              {score}/{questions.length}
            </div>
            <p className="text-muted-foreground mb-8">{Math.round(percentage)}% correct</p>

            <div className="space-y-3 mb-8 text-left">
              {isPassing ? (
                <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                  <div className="flex items-center gap-2 text-success mb-1">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Great conceptual understanding!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You've shown deep comprehension of the material. Keep exploring!
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-2 text-destructive mb-1">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">Areas to strengthen</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Review the explanations for questions you missed, then try again!
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={resetQuiz}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
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
              {notes && (
                <Button
                  variant={adaptiveMode ? "neon" : "outline"}
                  size="sm"
                  onClick={() => setAdaptiveMode(!adaptiveMode)}
                >
                  <Brain className="h-4 w-4 mr-1" />
                  Adaptive
                </Button>
              )}
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
          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary">
                {getTypeIcon(question.type)}
                <span className="text-sm font-medium">{getTypeLabel(question.type)}</span>
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
            ) : generatingAdaptive ? (
              <Button variant="neon" size="lg" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating next question...
              </Button>
            ) : (
              <Button variant="neon" size="lg" onClick={handleNextQuestion}>
                {adaptiveMode ? (
                  <>
                    Next Adaptive Question
                    <Brain className="h-4 w-4 ml-2" />
                  </>
                ) : currentQuestion < questions.length - 1 ? (
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

          {adaptiveMode && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Adaptive mode: Questions adjust based on your performance
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Quiz;
