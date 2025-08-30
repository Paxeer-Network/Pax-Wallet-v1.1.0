import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WalletService } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Gift, Trophy, CheckCircle, Clock, Calendar, BookOpen, Coins } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { LessonViewer } from "./LessonViewer";

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  difficulty: string;
  rewardAmount: string;
  estimatedTime: string;
  category: string;
  isActive: boolean;
}

interface DailyTask {
  id: string;
  title: string;
  description: string;
  taskType: string;
  rewardAmount: string;
  targetValue: string;
  userProgress?: {
    completed: boolean;
    progress: string;
    rewardClaimed: boolean;
  };
}

interface RewardTransaction {
  id: string;
  rewardType: string;
  amount: string;
  status: string;
  createdAt: string;
}

export function RewardsSection() {
  const [activeAccount, setActiveAccount] = useState(WalletService.getActiveAccount());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const account = WalletService.getActiveAccount();
    setActiveAccount(account);
  }, []);

  // Fetch lessons
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ["/api", "rewards", "lessons"],
    enabled: !!activeAccount?.address,
  });

  // Fetch daily tasks
  const { data: dailyTasks = [], isLoading: tasksLoading } = useQuery<DailyTask[]>({
    queryKey: ["/api", "rewards", "user", activeAccount?.address, "daily-tasks"],
    enabled: !!activeAccount?.address,
  });

  // Fetch reward transactions
  const { data: rewardTransactions = [], isLoading: transactionsLoading } = useQuery<RewardTransaction[]>({
    queryKey: ["/api", "rewards", "user", activeAccount?.address, "transactions"],
    enabled: !!activeAccount?.address,
  });

  // Daily check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/rewards/user/${activeAccount?.address}/checkin`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "rewards"] });
      toast({
        title: "Check-in Complete!",
        description: "Your daily reward has been queued for processing.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check-in Failed",
        description: error.message || "Unable to complete check-in",
        variant: "destructive",
      });
    },
  });

  // Complete lesson mutation
  const completeLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      return await apiRequest("POST", `/api/rewards/user/${activeAccount?.address}/complete-lesson`, { lessonId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "rewards"] });
      toast({
        title: "Lesson Completed!",
        description: "Your reward has been queued for processing.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Complete Lesson",
        description: error.message || "Unable to complete lesson",
        variant: "destructive",
      });
    },
  });

  const formatPaxAmount = (amount: string) => {
    const value = parseFloat(amount);
    // If it's already a normal number (not in wei), just format it nicely
    if (value < 1000) {
      return value % 1 === 0 ? value.toString() : value.toFixed(2);
    }
    // If it's in wei format, convert it
    const converted = value / 1e18;
    return converted % 1 === 0 ? converted.toString() : converted.toFixed(2);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500";
      case "intermediate":
        return "bg-yellow-500";
      case "advanced":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Check if user can check in today
  const canCheckInToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return !rewardTransactions.some(tx => 
      tx.rewardType === "checkin" && 
      tx.createdAt.startsWith(today)
    );
  };

  if (!activeAccount) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-white/60">Please create or select an account to access rewards</p>
      </div>
    );
  }

  // Show lesson viewer if a lesson is selected
  if (selectedLesson) {
    return (
      <LessonViewer
        lesson={selectedLesson}
        onComplete={(lessonId) => {
          completeLessonMutation.mutate(lessonId);
          setSelectedLesson(null);
        }}
        onBack={() => setSelectedLesson(null)}
        isPending={completeLessonMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Check-in Card */}
      <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-medium" data-testid="text-daily-checkin">Daily Check-in</h2>
            <p className="text-white/70 text-sm">Earn PAX coins every day</p>
          </div>
          <Button
            onClick={() => checkInMutation.mutate()}
            disabled={!canCheckInToday() || checkInMutation.isPending}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            data-testid="button-daily-checkin"
          >
            {checkInMutation.isPending ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : canCheckInToday() ? (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Check In
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Checked In
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="lessons" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-card-bg/30">
          <TabsTrigger value="lessons" className="text-white data-[state=active]:bg-primary">
            <BookOpen className="w-4 h-4 mr-2" />
            Lessons
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-white data-[state=active]:bg-primary">
            <Trophy className="w-4 h-4 mr-2" />
            Daily Tasks
          </TabsTrigger>
          <TabsTrigger value="history" className="text-white data-[state=active]:bg-primary">
            <Coins className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-4">
          {lessonsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card-bg/30 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-white/20 rounded mb-2"></div>
                  <div className="h-3 bg-white/20 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : lessons.length > 0 ? (
            lessons.map((lesson) => (
              <Card key={lesson.id} className="bg-card-bg/30 border-white/10" data-testid={`card-lesson-${lesson.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg" data-testid={`text-lesson-title-${lesson.id}`}>
                        {lesson.title}
                      </CardTitle>
                      <CardDescription className="text-white/60 text-sm mt-1">
                        {lesson.description}
                      </CardDescription>
                    </div>
                    <Badge className={`${getDifficultyColor(lesson.difficulty)} text-white text-xs`}>
                      {lesson.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Reward:</span>
                    <span className="text-primary font-medium" data-testid={`text-lesson-reward-${lesson.id}`}>
                      10 PAX
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Time:</span>
                    <span className="text-white">{lesson.estimatedTime}</span>
                  </div>
                  <Button
                    onClick={() => setSelectedLesson(lesson)}
                    className="w-full bg-primary hover:bg-primary/90"
                    data-testid={`button-start-lesson-${lesson.id}`}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Start Lesson
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="bg-card-bg/30 rounded-xl p-6 text-center">
              <BookOpen className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60">No lessons available</p>
            </div>
          )}
        </TabsContent>

        {/* Daily Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {tasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card-bg/30 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-white/20 rounded mb-2"></div>
                  <div className="h-3 bg-white/20 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : dailyTasks.length > 0 ? (
            dailyTasks.map((task) => {
              const progress = parseInt(task.userProgress?.progress || "0");
              const target = parseInt(task.targetValue);
              const progressPercentage = Math.min((progress / target) * 100, 100);
              
              return (
                <Card key={task.id} className="bg-card-bg/30 border-white/10" data-testid={`card-task-${task.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg flex items-center" data-testid={`text-task-title-${task.id}`}>
                          {task.title}
                          {task.userProgress?.completed && (
                            <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
                          )}
                        </CardTitle>
                        <CardDescription className="text-white/60 text-sm mt-1">
                          {task.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Reward:</span>
                      <span className="text-primary font-medium" data-testid={`text-task-reward-${task.id}`}>
                        {formatPaxAmount(task.rewardAmount)} PAX
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Progress:</span>
                        <span className="text-white" data-testid={`text-task-progress-${task.id}`}>
                          {progress}/{target}
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                    
                    {task.userProgress?.completed ? (
                      <div className="flex items-center justify-center py-2">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span className="text-green-500 font-medium">Completed!</span>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <span className="text-white/60 text-sm">
                          Complete this task to earn your reward
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="bg-card-bg/30 rounded-xl p-6 text-center">
              <Trophy className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60">No daily tasks available</p>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {transactionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card-bg/30 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-white/20 rounded mb-2"></div>
                  <div className="h-3 bg-white/20 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : rewardTransactions.length > 0 ? (
            rewardTransactions.map((tx) => (
              <Card key={tx.id} className="bg-card-bg/30 border-white/10" data-testid={`card-reward-${tx.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <Coins className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-white font-medium capitalize" data-testid={`text-reward-type-${tx.id}`}>
                          {tx.rewardType.replace('_', ' ')} Reward
                        </p>
                        <p className="text-white/60 text-sm">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-primary font-medium" data-testid={`text-reward-amount-${tx.id}`}>
                        +{formatPaxAmount(tx.amount)} PAX
                      </p>
                      <Badge className={`${getStatusColor(tx.status)} text-white text-xs`}>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="bg-card-bg/30 rounded-xl p-6 text-center">
              <Coins className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60">No reward history yet</p>
              <p className="text-white/40 text-sm mt-1">
                Complete lessons and daily tasks to start earning
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}