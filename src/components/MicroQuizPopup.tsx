import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Sparkles, Brain, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MicroQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface MicroQuizPopupProps {
  isOpen: boolean;
  onClose: () => void;
  topicName: string;
  topicId: string;
  todoId: string;
}

const MicroQuizPopup = ({ isOpen, onClose, topicName, topicId, todoId }: MicroQuizPopupProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<MicroQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isOpen && topicName) {
      generateMicroQuiz();
    }
  }, [isOpen, topicName]);

  const generateMicroQuiz = async () => {
    setLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsCompleted(false);

    try {
      const { data, error } = await supabase.functions.invoke('fix-weak-areas-quiz', {
        body: {
          weakTopics: [{ topic_id: topicId, topic_name: topicName }],
          questionsPerTopic: 3,
        },
      });

      if (error) throw error;

      if (data?.questions && data.questions.length > 0) {
        setQuestions(data.questions.map((q: any) => ({
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation || 'Great job reviewing this concept!',
        })));
      }
    } catch (error) {
      console.error('Error generating micro-quiz:', error);
      toast.error('Failed to generate quiz questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);

    if (index === questions[currentIndex].correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsCompleted(true);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state for next time
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsCompleted(false);
    setQuestions([]);
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Quick Quiz: {topicName}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-8 text-center">
            <Sparkles className="h-8 w-8 text-primary animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Generating quiz questions...</p>
          </div>
        )}

        {!loading && questions.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No questions available for this topic.</p>
            <Button onClick={handleClose} className="mt-4">Close</Button>
          </div>
        )}

        {!loading && questions.length > 0 && !isCompleted && currentQuestion && (
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              Question {currentIndex + 1} of {questions.length}
            </p>

            <div className="glass-card p-4 rounded-xl">
              <p className="font-medium">{currentQuestion.question}</p>
            </div>

            <div className="space-y-2">
              {currentQuestion.options.map((option, index) => {
                const isCorrect = index === currentQuestion.correctIndex;
                const isSelected = selectedAnswer === index;
                let optionClass = 'glass-card';

                if (showResult) {
                  if (isCorrect) {
                    optionClass = 'bg-green-500/20 border-green-500';
                  } else if (isSelected && !isCorrect) {
                    optionClass = 'bg-destructive/20 border-destructive';
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={showResult}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${optionClass} ${
                      !showResult ? 'hover:border-primary cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {showResult && isCorrect && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {showResult && (
              <div className={`p-3 rounded-xl ${
                selectedAnswer === currentQuestion.correctIndex 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-destructive/10 border border-destructive/30'
              }`}>
                <p className="text-sm">{currentQuestion.explanation}</p>
              </div>
            )}

            {showResult && (
              <Button onClick={handleNext} className="w-full">
                {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
              </Button>
            )}
          </div>
        )}

        {!loading && isCompleted && (
          <div className="py-6 text-center space-y-4">
            <Trophy className="h-12 w-12 text-primary mx-auto" />
            <h3 className="text-xl font-bold">Quiz Complete!</h3>
            <p className="text-2xl font-bold neon-text">
              {score} / {questions.length}
            </p>
            <p className="text-muted-foreground">
              {score === questions.length
                ? "Perfect! You've mastered this topic!"
                : score >= questions.length / 2
                ? 'Good job! Keep practicing.'
                : 'Keep reviewing this topic for better results.'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={generateMicroQuiz} className="flex-1">
                Try Again
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MicroQuizPopup;
