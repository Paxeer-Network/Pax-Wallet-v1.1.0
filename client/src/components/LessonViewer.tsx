import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LessonViewerProps {
  lesson: any;
  onComplete: (lessonId: string) => void;
  onBack: () => void;
  isPending: boolean;
}

const TIMER_DURATION = 120; // 2 minutes total lesson time

export function LessonViewer({ lesson, onComplete, onBack, isPending }: LessonViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [canProceed, setCanProceed] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const { toast } = useToast();

  // Parse lesson content
  const content = JSON.parse(lesson.content);
  const chapters = content.chapters || [];
  
  // Create 5 lesson pages from chapters
  const lessonPages: Array<{title: string, content: string, type: string}> = [];
  chapters.forEach((chapter: any, index: number) => {
    // Split chapter content into multiple pages
    const pages = [
      {
        title: chapter.title,
        content: chapter.content,
        type: "content"
      },
      {
        title: `${chapter.title} - Key Points`,
        content: chapter.keyPoints?.join("\n• ") || "",
        type: "keypoints"
      }
    ];
    lessonPages.push(...pages);
  });

  // Limit to 5 pages max
  const finalLessonPages = lessonPages.slice(0, 5);

  // Create quiz pages from chapter quizzes
  const quizPages: Array<{question: string, options: string[], correct: number, explanation?: string}> = chapters
    .filter((chapter: any) => chapter.quiz)
    .slice(0, 2)
    .map((chapter: any) => ({
      question: chapter.quiz.question,
      options: chapter.quiz.options,
      correct: chapter.quiz.correct,
      explanation: chapter.quiz.explanation
    }));

  const totalPages = finalLessonPages.length + quizPages.length;
  const isQuizPage = currentPage >= finalLessonPages.length;
  const quizIndex = currentPage - finalLessonPages.length;

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !canProceed) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setCanProceed(true);
    }
  }, [timeLeft, canProceed]);

  // Reset timer when page changes
  useEffect(() => {
    setTimeLeft(TIMER_DURATION);
    setCanProceed(false);
  }, [currentPage]);

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    } else if (lessonCompleted && quizAnswers.length === quizPages.length) {
      // Check quiz answers
      const correctAnswers = quizPages.every((quiz, index) => quizAnswers[index] === quiz.correct);
      if (correctAnswers) {
        onComplete(lesson.id);
      } else {
        toast({
          title: "Quiz Failed",
          description: "Please review the lesson and try again.",
          variant: "destructive",
        });
        setCurrentPage(0);
        setQuizAnswers([]);
        setLessonCompleted(false);
      }
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleQuizAnswer = (answerIndex: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[quizIndex] = answerIndex;
    setQuizAnswers(newAnswers);
    
    setTimeout(() => {
      setCanProceed(true);
      if (currentPage === totalPages - 1) {
        setLessonCompleted(true);
      }
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Lessons
        </Button>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline">{lesson.difficulty}</Badge>
          <div className="text-lg font-bold text-primary">10 PAX</div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{lesson.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className={`font-mono ${timeLeft <= 10 ? 'text-red-500' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Progress: {currentPage + 1} of {totalPages}</span>
              <span>{isQuizPage ? 'Quiz' : 'Lesson'}</span>
            </div>
            <Progress value={((currentPage + 1) / totalPages) * 100} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isQuizPage ? (
            // Lesson page
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                {finalLessonPages[currentPage]?.title}
              </h2>
              
              <div className="prose prose-sm max-w-none">
                {finalLessonPages[currentPage]?.type === "keypoints" ? (
                  <ul className="space-y-2">
                    {finalLessonPages[currentPage]?.content.split('\n').map((point: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{point.replace('• ', '')}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {finalLessonPages[currentPage]?.content}
                  </p>
                )}
              </div>
            </div>
          ) : (
            // Quiz page
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Quiz Question {quizIndex + 1}</h2>
                <p className="text-muted-foreground">Answer correctly to earn your PAX reward!</p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {quizPages[quizIndex]?.question}
                </h3>
                
                <div className="grid gap-3">
                  {quizPages[quizIndex]?.options.map((option: string, index: number) => (
                    <Button
                      key={index}
                      variant={quizAnswers[quizIndex] === index ? "default" : "outline"}
                      className="text-left p-4 h-auto justify-start"
                      onClick={() => handleQuizAnswer(index)}
                      disabled={quizAnswers[quizIndex] !== undefined}
                    >
                      <span className="mr-3 font-bold">{String.fromCharCode(65 + index)}.</span>
                      {option}
                    </Button>
                  ))}
                </div>
                
                {quizAnswers[quizIndex] !== undefined && (
                  <div className={`p-4 rounded-lg ${
                    quizAnswers[quizIndex] === quizPages[quizIndex]?.correct 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`font-medium ${
                      quizAnswers[quizIndex] === quizPages[quizIndex]?.correct 
                        ? 'text-green-800' 
                        : 'text-red-800'
                    }`}>
                      {quizAnswers[quizIndex] === quizPages[quizIndex]?.correct 
                        ? "Correct!" 
                        : "Incorrect"
                      }
                    </p>
                    {quizPages[quizIndex]?.explanation && (
                      <p className="text-sm mt-2 text-gray-600">
                        {quizPages[quizIndex].explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentPage === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed || isPending}
          className="flex items-center gap-2"
        >
          {currentPage === totalPages - 1 ? (
            lessonCompleted ? (
              isPending ? "Claiming Reward..." : "Claim 10 PAX Reward"
            ) : "Complete Quiz"
          ) : (
            "Next"
          )}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {!canProceed && !isQuizPage && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            📚 Take your time to read this page. You can proceed to the next page in {formatTime(timeLeft)}.
          </p>
        </div>
      )}
    </div>
  );
}