import { apiRequest } from "./queryClient";

export interface UserProgress {
  userId: string;
  level: number;
  xp: number;
  totalEarned: string;
  streak: number;
  lastCheckIn: string;
  lessonsCompleted: string[];
  achievements: string[];
  dailyChallengeProgress: Record<string, number>;
}

export class RewardsService {
  // Calculate level from XP
  static calculateLevel(xp: number): number {
    return Math.floor(xp / 100) + 1;
  }

  // Calculate XP needed for next level
  static calculateXPToNextLevel(xp: number): number {
    const currentLevel = this.calculateLevel(xp);
    const xpForNextLevel = currentLevel * 100;
    return xpForNextLevel - xp;
  }

  // Check if user can check in today
  static canCheckInToday(lastCheckIn: string): boolean {
    if (!lastCheckIn) return true;
    
    const today = new Date().toISOString().split('T')[0];
    const lastCheckInDate = new Date(lastCheckIn).toISOString().split('T')[0];
    
    return today !== lastCheckInDate;
  }

  // Calculate streak
  static calculateStreak(lastCheckIn: string): number {
    if (!lastCheckIn) return 0;
    
    const today = new Date();
    const lastCheckInDate = new Date(lastCheckIn);
    const diffTime = Math.abs(today.getTime() - lastCheckInDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If last check-in was yesterday, continue streak
    // If it was today, maintain current streak
    // If it was more than 1 day ago, streak is broken
    return diffDays <= 1 ? 1 : 0;
  }

  // Process daily check-in
  static async processCheckIn(userAddress: string): Promise<{
    success: boolean;
    reward: number;
    xp: number;
    streak: number;
    levelUp: boolean;
    newLevel?: number;
  }> {
    const response = await apiRequest("POST", `/api/rewards/user/${userAddress}/checkin`, {});
    return response;
  }

  // Process lesson completion
  static async processLessonCompletion(userAddress: string, lessonId: string): Promise<{
    success: boolean;
    reward: number;
    xp: number;
    levelUp: boolean;
    newLevel?: number;
    achievement?: string;
  }> {
    const response = await apiRequest("POST", `/api/rewards/user/${userAddress}/complete-lesson`, {
      lessonId
    });
    return response;
  }

  // Get user stats
  static async getUserStats(userAddress: string): Promise<{
    level: number;
    xp: number;
    xpToNextLevel: number;
    totalEarned: string;
    streak: number;
    lessonsCompleted: number;
    achievements: any[];
  }> {
    const response = await apiRequest("GET", `/api/rewards/user/${userAddress}/stats`);
    return response;
  }

  // Update daily challenge progress
  static async updateChallengeProgress(
    userAddress: string, 
    challengeType: string, 
    increment: number = 1
  ): Promise<void> {
    await apiRequest("POST", `/api/rewards/user/${userAddress}/challenge-progress`, {
      challengeType,
      increment
    });
  }

  // Auto-reward system - called when user performs actions
  static async trackUserAction(userAddress: string, action: string, metadata?: any): Promise<void> {
    await apiRequest("POST", `/api/rewards/track-action`, {
      userAddress,
      action,
      metadata
    });
  }
}

// Helper function to trigger reward tracking for common actions
export const trackRewardAction = async (action: string, metadata?: any) => {
  try {
    const activeAccount = localStorage.getItem('activeAccount');
    if (!activeAccount) return;

    const account = JSON.parse(activeAccount);
    await RewardsService.trackUserAction(account.address, action, metadata);
  } catch (error) {
    console.warn('Failed to track reward action:', error);
  }
};

// Common reward actions
export const REWARD_ACTIONS = {
  SWAP_COMPLETED: 'swap_completed',
  PORTFOLIO_VIEWED: 'portfolio_viewed',
  LESSON_STARTED: 'lesson_started',
  LESSON_COMPLETED: 'lesson_completed',
  DAILY_CHECKIN: 'daily_checkin',
  FIRST_TRANSACTION: 'first_transaction',
  WEEK_STREAK: 'week_streak',
  MONTH_STREAK: 'month_streak'
};
