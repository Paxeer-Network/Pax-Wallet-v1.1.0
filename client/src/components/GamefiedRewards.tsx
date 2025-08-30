import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WalletService } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Star, 
  Flame, 
  Crown, 
  Target, 
  Clock, 
  CheckCircle, 
  Zap, 
  Award,
  TrendingUp,
  Calendar,
  BookOpen,
  Coins,
  Gift
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { LessonViewer } from "./LessonViewer";

// Utility function to format numbers to 2 decimal places
const formatNumber = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

interface UserStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalEarned: string;
  streak: number;
  lessonsCompleted: number;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  rewardAmount: string;
  xpReward: number;
  estimatedTime: string;
  category: string;
  isActive: boolean;
  completed?: boolean;
  completedAt?: string;
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  rewardAmount: string;
  xpReward: number;
  progress: number;
  target: number;
  completed: boolean;
  expiresAt: string;
}

export function GamefiedRewards() {
  const [activeAccount, setActiveAccount] = useState(WalletService.getActiveAccount());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const account = WalletService.getActiveAccount();
    setActiveAccount(account);
  }, []);

  // Fetch user stats and progress
  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api", "rewards", "user", activeAccount?.address, "stats"],
    enabled: !!activeAccount?.address,
  });

  // Fetch lessons
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ["/api", "rewards", "lessons"],
    enabled: !!activeAccount?.address,
  });

  // Fetch daily challenges
  const { data: dailyChallenges = [], isLoading: challengesLoading } = useQuery<DailyChallenge[]>({
    queryKey: ["/api", "rewards", "user", activeAccount?.address, "daily-challenges"],
    enabled: !!activeAccount?.address,
  });

  // Daily check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/rewards/user/${activeAccount?.address}/checkin`, {});
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api", "rewards"] });
      if (data.levelUp) {
        setShowCelebration(true);
        toast({
          title: "🎉 Level Up!",
          description: `You've reached level ${data.newLevel}!`,
        });
      } else {
        toast({
          title: "✅ Daily Streak!",
          description: `+${data.xp} XP • ${data.streak} day streak!`,
        });
      }
    },
  });

  // Complete lesson mutation
  const completeLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      return await apiRequest("POST", `/api/rewards/user/${activeAccount?.address}/complete-lesson`, { 
        lessonId 
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api", "rewards"] });
      if (data.levelUp) {
        setShowCelebration(true);
        toast({
          title: "🎉 Level Up!",
          description: `Lesson completed! You've reached level ${data.newLevel}!`,
        });
      } else {
        toast({
          title: "🎓 Lesson Complete!",
          description: `+10 PAX • +${data.xp} XP earned!`,
        });
      }
    },
  });

  const getLevelProgress = () => {
    if (!userStats) return 0;
    const currentLevelXP = userStats.xp - (userStats.level - 1) * 100;
    return (currentLevelXP / 100) * 100;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-500";
      case "intermediate": return "bg-yellow-500";
      case "advanced": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return "text-purple-500";
    if (streak >= 7) return "text-orange-500";
    if (streak >= 3) return "text-yellow-500";
    return "text-blue-500";
  };

  if (!activeAccount) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-white/60">Please create or select an account to access rewards</p>
      </div>
    );
  }

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
      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-2xl text-center">
            <Crown className="w-16 h-16 mx-auto mb-4 text-white" />
            <h2 className="text-2xl font-bold text-white mb-2">Level Up!</h2>
            <p className="text-white/90">You've reached level {userStats?.level}!</p>
            <Button 
              onClick={() => setShowCelebration(false)}
              className="mt-4 bg-white text-orange-500 hover:bg-white/90"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Player Stats Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-white text-xl font-bold">Level {userStats?.level || 1}</h2>
              <p className="text-white/70">{formatNumber(userStats?.totalEarned || "0")} PAX Earned</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className={`flex items-center space-x-1 ${getStreakColor(userStats?.streak || 0)}`}>
                <Flame className="w-5 h-5" />
                <span className="font-bold text-lg">{userStats?.streak || 0}</span>
              </div>
              <p className="text-white/60 text-xs">Day Streak</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center space-x-1 text-blue-400">
                <Star className="w-5 h-5" />
                <span className="font-bold text-lg">{userStats?.xp || 0} XP</span>
              </div>
              <p className="text-white/60 text-xs">Experience</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/70">Progress to Level {(userStats?.level || 1) + 1}</span>
            <span className="text-white">{userStats?.xpToNextLevel || 100} XP needed</span>
          </div>
          <Progress value={getLevelProgress()} className="h-3" />
        </div>
      </div>

      {/* Daily Check-in */}
      <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center">
                <Gift className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Daily Reward</h3>
                <p className="text-white/70 text-sm">Claim your daily PAX + XP bonus</p>
              </div>
            </div>
            <Button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {checkInMutation.isPending ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Check In
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="lessons" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-card-bg/30">
          <TabsTrigger value="lessons">
            <BookOpen className="w-4 h-4 mr-2" />
            Learn & Earn
          </TabsTrigger>
          <TabsTrigger value="challenges">
            <Target className="w-4 h-4 mr-2" />
            Daily Challenges  
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Trophy className="w-4 h-4 mr-2" />
            Achievements
          </TabsTrigger>
        </TabsList>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-4">
          {lessonsLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card-bg/30 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-white/20 rounded mb-2"></div>
                  <div className="h-3 bg-white/20 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {lessons.map((lesson) => (
                <Card key={lesson.id} className="bg-card-bg/30 border-white/10 hover:bg-card-bg/40 transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{lesson.title}</h3>
                            <p className="text-white/60 text-sm">{lesson.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 mb-4">
                          <Badge className={`${getDifficultyColor(lesson.difficulty)} text-white text-xs`}>
                            {lesson.difficulty}
                          </Badge>
                          <div className="flex items-center text-white/60 text-sm">
                            <Clock className="w-4 h-4 mr-1" />
                            2 min
                          </div>
                          <div className="flex items-center text-primary text-sm font-medium">
                            <Coins className="w-4 h-4 mr-1" />
                            {formatNumber(lesson.rewardAmount)} PAX
                          </div>
                          <div className="flex items-center text-blue-400 text-sm font-medium">
                            <Zap className="w-4 h-4 mr-1" />
                            +{lesson.xpReward} XP
                          </div>
                        </div>
                        
                        {lesson.completed ? (
                          <div className="flex items-center justify-center py-2">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                            <span className="text-green-500 font-medium">Completed!</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setSelectedLesson(lesson)}
                            className="w-full bg-primary hover:bg-primary/90"
                          >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Start Lesson
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Daily Challenges Tab */}
        <TabsContent value="challenges" className="space-y-4">
          {challengesLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card-bg/30 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-white/20 rounded mb-2"></div>
                  <div className="h-3 bg-white/20 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {dailyChallenges.map((challenge) => (
                <Card key={challenge.id} className="bg-card-bg/30 border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                          <Target className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{challenge.title}</h3>
                          <p className="text-white/60 text-sm">{challenge.description}</p>
                        </div>
                      </div>
                      
                      {challenge.completed && (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Progress</span>
                        <span className="text-white">{challenge.progress}/{challenge.target}</span>
                      </div>
                      <Progress value={(challenge.progress / challenge.target) * 100} className="h-2" />
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-primary text-sm font-medium">
                            <Coins className="w-4 h-4 mr-1" />
                            {formatNumber(challenge.rewardAmount)} PAX
                          </div>
                          <div className="flex items-center text-blue-400 text-sm font-medium">
                            <Zap className="w-4 h-4 mr-1" />
                            +{challenge.xpReward} XP
                          </div>
                        </div>
                        <span className="text-white/60 text-xs">
                          Expires {new Date(challenge.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <div className="grid gap-4">
            {userStats?.achievements?.map((achievement) => (
              <Card key={achievement.id} className={`border-white/10 ${
                achievement.unlocked ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-card-bg/30'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      achievement.unlocked ? 'bg-yellow-500/20' : 'bg-gray-500/20'
                    }`}>
                      <Award className={`w-6 h-6 ${
                        achievement.unlocked ? 'text-yellow-400' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${
                        achievement.unlocked ? 'text-yellow-400' : 'text-white/60'
                      }`}>
                        {achievement.title}
                      </h3>
                      <p className="text-white/60 text-sm">{achievement.description}</p>
                      {achievement.unlocked && achievement.unlockedAt && (
                        <p className="text-yellow-400/80 text-xs mt-1">
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {achievement.unlocked && (
                      <CheckCircle className="w-6 h-6 text-yellow-400" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )) || (
              <div className="bg-card-bg/30 rounded-xl p-6 text-center">
                <Trophy className="w-12 h-12 text-white/40 mx-auto mb-3" />
                <p className="text-white/60">No achievements yet</p>
                <p className="text-white/40 text-sm mt-1">
                  Complete lessons and challenges to unlock achievements
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
