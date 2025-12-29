import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Trophy,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Logo from '@/components/Logo';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

// Mock quiz data
const mockQuiz: Question[] = [
  {
    id: 1,
    question: 'What is Machine Learning?',
    options: [
      'A programming language',
      'A subset of AI that enables systems to learn from data',
      'A type of computer hardware',
      'A database management system',
    ],
    correctAnswer: 1,
  },
  {
    id: 2,
    question: 'Which of these is NOT a type of machine learning?',
    options: [
      'Supervised Learning',
      'Unsupervised Learning',
      'Reinforcement Learning',
      'Manual Learning',
    ],
    correctAnswer: 3,
  },
  {
    id: 3,
    question: 'What is overfitting in machine learning?',
    options: [
      'When a model is too simple',
      'When a model learns noise instead of patterns',
      'When there is not enough data',
      'When the algorithm runs too fast',
    ],
    correctAnswer: 1,
  },
  {
    id: 4,
    question: 'What is the purpose of cross-validation?',
    options: [
      'To speed up training',
      'To reduce data size',
      'To prevent overfitting',
      'To increase model complexity',
    ],
    correctAnswer: 2,
  },
  {
    id: 5,
    question: 'Which algorithm is commonly used for classification?',
    options: [
      'Linear Regression',
      'K-Means Clustering',
      'Decision Trees',
      'Principal Component Analysis',
    ],
    correctAnswer: 2,
  },
];

const Quiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const question = mockQuiz[currentQuestion];
  const progress = ((currentQuestion + 1) / mockQuiz.length) * 100;

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

    if (selectedAnswer === question.correctAnswer) {
      toast.success('Correct! 🎉');
    } else {
      toast.error('Not quite right');
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < mockQuiz.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
    } else {
      setShowResult(true);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer, index) => {
      if (answer === mockQuiz[index].correctAnswer) {
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
  };

  const score = calculateScore();
  const percentage = (score / mockQuiz.length) * 100;
  const isPassing = percentage >= 60;

  if (showResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg text-center animate-slide-up">
          <div
            className={`glass-card rounded-2xl p-8 ${
              isPassing ? 'neon-glow' : ''
            }`}
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
                ? "You've mastered this topic!"
                : "Don't worry, practice makes perfect!"}
            </p>

            <div className="text-5xl font-bold neon-text mb-2">
              {score}/{mockQuiz.length}
            </div>
            <p className="text-muted-foreground mb-8">{Math.round(percentage)}% correct</p>

            {/* Feedback cards */}
            <div className="space-y-3 mb-8 text-left">
              {isPassing ? (
                <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                  <div className="flex items-center gap-2 text-success mb-1">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Great performance!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You have a solid understanding of the material. Keep up the great work!
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-2 text-destructive mb-1">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">Areas to improve</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Review the video and notes again, then try the quiz once more!
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
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Logo size="sm" />
            </div>
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {mockQuiz.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="animate-fade-in">
          {/* Question */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium">Question {currentQuestion + 1}</span>
            </div>
            <h2 className="text-xl font-semibold">{question.question}</h2>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
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

          {/* Actions */}
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
                {currentQuestion < mockQuiz.length - 1 ? (
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

export default Quiz;
