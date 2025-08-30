import { Router } from "express";
import { storage } from "../storage";
import { randomUUID } from "crypto";

const router = Router();

// Helper function to calculate user level from XP
function calculateLevel(xp: number): number {
  // Simple level formula: level = floor(sqrt(xp/100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// Helper function to get XP needed for next level
function getXpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

// Get or create user stats
async function getUserStatsOrCreate(userAddress: string) {
  let userStats = await storage.getUserStats(userAddress);
  
  if (!userStats) {
    userStats = await storage.createUserStats({
      userAddress,
      level: "1",
      xp: "0",
      totalEarned: "0",
      streak: "0",
      lessonsCompleted: "0",
      lastCheckIn: null,
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  return userStats;
}

// Check and award achievements for a user
async function checkAndAwardAchievements(userAddress: string, userStats: any) {
  const achievements = await storage.getAchievements();
  const userAchievements = await storage.getUserAchievements(userAddress);
  const unlockedAchievementIds = userAchievements.map(ua => ua.achievementId);
  
  const newlyUnlocked = [];
  
  for (const achievement of achievements) {
    if (unlockedAchievementIds.includes(achievement.id)) continue;
    
    const requirement = JSON.parse(achievement.requirement);
    let shouldUnlock = false;
    
    switch (requirement.type) {
      case 'lessons_completed':
        shouldUnlock = parseInt(userStats.lessonsCompleted) >= requirement.value;
        break;
      case 'daily_streak':
        shouldUnlock = parseInt(userStats.streak) >= requirement.value;
        break;
      case 'level_reached':
        shouldUnlock = parseInt(userStats.level) >= requirement.value;
        break;
      case 'all_lessons_completed':
        const totalLessons = await storage.getLessons();
        shouldUnlock = parseInt(userStats.lessonsCompleted) >= totalLessons.length;
        break;
    }
    
    if (shouldUnlock) {
      await storage.createUserAchievement({
        userAddress,
        achievementId: achievement.id,
        unlockedAt: new Date(),
        xpAwarded: achievement.rewardXp || "0"
      });
      
      newlyUnlocked.push(achievement);
    }
  }
  
  return newlyUnlocked;
}

// GET /api/gamification/stats/:userAddress - Get user stats and progress
router.get("/stats/:userAddress", async (req, res) => {
  try {
    const { userAddress } = req.params;
    const userStats = await getUserStatsOrCreate(userAddress);
    
    const currentXp = parseInt(userStats.xp);
    const currentLevel = parseInt(userStats.level);
    const xpForCurrentLevel = getXpForLevel(currentLevel);
    const xpForNextLevel = getXpForLevel(currentLevel + 1);
    const xpProgress = currentXp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    
    res.json({
      ...userStats,
      currentXp,
      currentLevel,
      xpProgress,
      xpNeeded,
      progressPercentage: Math.round((xpProgress / xpNeeded) * 100)
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

// GET /api/gamification/achievements/:userAddress - Get user achievements
router.get("/achievements/:userAddress", async (req, res) => {
  try {
    const { userAddress } = req.params;
    const allAchievements = await storage.getAchievements();
    const userAchievements = await storage.getUserAchievements(userAddress);
    
    const achievementsWithStatus = allAchievements.map(achievement => {
      const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
      return {
        ...achievement,
        unlocked: !!userAchievement,
        unlockedAt: userAchievement?.unlockedAt || null,
        requirement: JSON.parse(achievement.requirement)
      };
    });
    
    res.json(achievementsWithStatus);
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

// GET /api/gamification/challenges/:userAddress - Get daily challenges for user
router.get("/challenges/:userAddress", async (req, res) => {
  try {
    const { userAddress } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    const allChallenges = await storage.getDailyChallenges();
    const userChallenges = await storage.getUserChallenges(userAddress, today);
    
    const challengesWithStatus = allChallenges.map(challenge => {
      const userChallenge = userChallenges.find(uc => uc.challengeId === challenge.id);
      return {
        ...challenge,
        progress: userChallenge?.progress || "0",
        completed: userChallenge?.completed || false,
        completedAt: userChallenge?.completedAt || null,
        rewardClaimed: userChallenge?.rewardClaimed || false,
        target: parseInt(challenge.target)
      };
    });
    
    res.json(challengesWithStatus);
  } catch (error) {
    console.error("Error fetching daily challenges:", error);
    res.status(500).json({ error: "Failed to fetch daily challenges" });
  }
});

// POST /api/gamification/lesson-complete - Mark lesson as completed
router.post("/lesson-complete", async (req, res) => {
  try {
    const { userAddress, lessonId } = req.body;
    
    if (!userAddress || !lessonId) {
      return res.status(400).json({ error: "userAddress and lessonId are required" });
    }
    
    // Check if lesson already completed
    const existingProgress = await storage.getUserLessonProgress(userAddress, lessonId);
    if (existingProgress && existingProgress.completed) {
      return res.status(400).json({ error: "Lesson already completed" });
    }
    
    // Get lesson details
    const lesson = await storage.getLesson(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }
    
    // Mark lesson as completed
    if (existingProgress) {
      await storage.updateUserProgress(existingProgress.id, {
        completed: true,
        completedAt: new Date(),
        xpAwarded: "50" // Default XP for lesson completion
      });
    } else {
      await storage.createUserProgress({
        userAddress,
        lessonId,
        completed: true,
        completedAt: new Date(),
        xpAwarded: "50"
      });
    }
    
    // Update user stats
    const userStats = await getUserStatsOrCreate(userAddress);
    const newLessonsCompleted = parseInt(userStats.lessonsCompleted) + 1;
    const newXp = parseInt(userStats.xp) + 50;
    const newLevel = calculateLevel(newXp);
    
    const updatedStats = await storage.updateUserStats(userAddress, {
      lessonsCompleted: newLessonsCompleted.toString(),
      xp: newXp.toString(),
      level: newLevel.toString(),
      totalEarned: (parseFloat(userStats.totalEarned) + parseFloat(lesson.rewardAmount)).toString(),
      lastActivity: new Date(),
      updatedAt: new Date()
    });
    
    // Check for new achievements
    const newAchievements = await checkAndAwardAchievements(userAddress, {
      ...updatedStats,
      lessonsCompleted: newLessonsCompleted.toString(),
      xp: newXp.toString(),
      level: newLevel.toString()
    });
    
    // Update lesson daily challenge progress
    const today = new Date().toISOString().split('T')[0];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);
    expiresAt.setHours(0, 0, 0, 0);
    
    const lessonChallenge = await storage.getUserChallenge(userAddress, 'complete_lesson', today);
    if (lessonChallenge) {
      const newProgress = parseInt(lessonChallenge.progress) + 1;
      const completed = newProgress >= 1;
      
      await storage.updateUserChallenge(lessonChallenge.id, {
        progress: newProgress.toString(),
        completed,
        completedAt: completed ? new Date() : null
      });
    } else {
      await storage.createUserChallenge({
        userAddress,
        challengeId: 'complete_lesson',
        date: today,
        progress: "1",
        completed: true,
        completedAt: new Date(),
        rewardClaimed: false,
        expiresAt
      });
    }
    
    res.json({
      success: true,
      xpAwarded: 50,
      paxAwarded: lesson.rewardAmount,
      newLevel: newLevel > parseInt(userStats.level),
      newAchievements,
      userStats: updatedStats
    });
    
  } catch (error) {
    console.error("Error completing lesson:", error);
    res.status(500).json({ error: "Failed to complete lesson" });
  }
});

// POST /api/gamification/daily-checkin - Perform daily check-in
router.post("/daily-checkin", async (req, res) => {
  try {
    const { userAddress } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: "userAddress is required" });
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already checked in today
    const existingCheckin = await storage.getDailyCheckin(userAddress, today);
    if (existingCheckin) {
      return res.status(400).json({ error: "Already checked in today" });
    }
    
    // Create daily check-in record
    await storage.createDailyCheckin({
      userAddress,
      date: today,
      xpAwarded: "10",
      paxAwarded: "1",
      streakDay: "1" // This will be calculated properly
    });
    
    // Update user stats
    const userStats = await getUserStatsOrCreate(userAddress);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const yesterdayCheckin = await storage.getDailyCheckin(userAddress, yesterdayStr);
    const currentStreak = yesterdayCheckin ? parseInt(userStats.streak) + 1 : 1;
    
    const newXp = parseInt(userStats.xp) + 10;
    const newLevel = calculateLevel(newXp);
    
    const updatedStats = await storage.updateUserStats(userAddress, {
      xp: newXp.toString(),
      level: newLevel.toString(),
      streak: currentStreak.toString(),
      totalEarned: (parseFloat(userStats.totalEarned) + 1).toString(),
      lastCheckIn: new Date(),
      lastActivity: new Date(),
      updatedAt: new Date()
    });
    
    // Update daily check-in challenge
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);
    expiresAt.setHours(0, 0, 0, 0);
    
    const checkinChallenge = await storage.getUserChallenge(userAddress, 'daily_checkin', today);
    if (!checkinChallenge) {
      await storage.createUserChallenge({
        userAddress,
        challengeId: 'daily_checkin',
        date: today,
        progress: "1",
        completed: true,
        completedAt: new Date(),
        rewardClaimed: false,
        expiresAt
      });
    }
    
    // Check for new achievements (especially streak-based)
    const newAchievements = await checkAndAwardAchievements(userAddress, {
      ...updatedStats,
      streak: currentStreak.toString(),
      xp: newXp.toString(),
      level: newLevel.toString()
    });
    
    res.json({
      success: true,
      xpAwarded: 10,
      paxAwarded: 1,
      streak: currentStreak,
      newLevel: newLevel > parseInt(userStats.level),
      newAchievements,
      userStats: updatedStats
    });
    
  } catch (error) {
    console.error("Error performing daily check-in:", error);
    res.status(500).json({ error: "Failed to perform daily check-in" });
  }
});

// POST /api/gamification/challenge-claim - Claim daily challenge reward
router.post("/challenge-claim", async (req, res) => {
  try {
    const { userAddress, challengeId } = req.body;
    
    if (!userAddress || !challengeId) {
      return res.status(400).json({ error: "userAddress and challengeId are required" });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const userChallenge = await storage.getUserChallenge(userAddress, challengeId, today);
    
    if (!userChallenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    
    if (!userChallenge.completed) {
      return res.status(400).json({ error: "Challenge not completed" });
    }
    
    if (userChallenge.rewardClaimed) {
      return res.status(400).json({ error: "Reward already claimed" });
    }
    
    // Get challenge details for reward amounts
    const challenge = await storage.getDailyChallenge(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge definition not found" });
    }
    
    // Mark reward as claimed
    await storage.updateUserChallenge(userChallenge.id, {
      rewardClaimed: true,
      claimedAt: new Date()
    });
    
    // Update user stats
    const userStats = await getUserStatsOrCreate(userAddress);
    const xpReward = parseInt(challenge.xpReward);
    const paxReward = parseFloat(challenge.rewardAmount);
    
    const newXp = parseInt(userStats.xp) + xpReward;
    const newLevel = calculateLevel(newXp);
    
    await storage.updateUserStats(userAddress, {
      xp: newXp.toString(),
      level: newLevel.toString(),
      totalEarned: (parseFloat(userStats.totalEarned) + paxReward).toString(),
      lastActivity: new Date(),
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      xpAwarded: xpReward,
      paxAwarded: paxReward,
      newLevel: newLevel > parseInt(userStats.level)
    });
    
  } catch (error) {
    console.error("Error claiming challenge reward:", error);
    res.status(500).json({ error: "Failed to claim challenge reward" });
  }
});

// GET /api/gamification/leaderboard - Get user leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    // This would require a custom query to get top users by XP/level
    // For now, return a placeholder response
    res.json({
      leaderboard: [],
      message: "Leaderboard feature coming soon"
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
