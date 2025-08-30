import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAccountSchema, insertTransactionSchema, insertLessonSchema, insertDailyTaskSchema, insertSwapTransactionSchema } from "@shared/schema";
import { OptionsService } from "./lib/optionsService";
import { z } from "zod";
import { ethers } from "ethers";
import { BlockchainService } from "./lib/blockchainService";
import gamificationRoutes from "./routes/gamification";

// Utility function to normalize PAX amounts for blockchain transactions
function normalizeAmountForBlockchain(amount: string | number): string {
  // Convert 2-decimal PAX amount to wei (18 decimals)
  return ethers.parseUnits(amount.toString(), 18).toString();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Register gamification routes
  app.use("/api/gamification", gamificationRoutes);
  
  // Account routes
  app.get("/api/accounts", async (req, res) => {
    try {
      const accounts = await storage.getAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.get("/api/accounts/active", async (req, res) => {
    try {
      const activeAccount = await storage.getActiveAccount();
      if (!activeAccount) {
        return res.status(404).json({ error: "No active account found" });
      }
      res.json(activeAccount);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active account" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const accountData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid account data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/accounts/:id/activate", async (req, res) => {
    try {
      await storage.setActiveAccount(req.params.id);
      const activeAccount = await storage.getActiveAccount();
      res.json(activeAccount);
    } catch (error) {
      res.status(500).json({ error: "Failed to activate account" });
    }
  });

  // Transaction routes
  app.get("/api/accounts/:id/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid transaction data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  // Token routes
  app.get("/api/accounts/:id/tokens", async (req, res) => {
    try {
      const tokens = await storage.getTokens(req.params.id);
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tokens" });
    }
  });

  // DEX API routes for token prices and logos (separate from options API)
  app.get("/api/dex/tokens", async (req, res) => {
    try {
      const response = await fetch("/api/proxy/swap/transactions");
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      const result = await response.json();
      res.json(result.success ? result.data : []);
    } catch (error) {
      console.error("Error fetching DEX tokens:", error);
      res.status(500).json({ error: "Failed to fetch token data from DEX API" });
    }
  });

  // Enhanced Paxeer API routes with multi-source data
  app.get("/api/paxeer/stats", async (req, res) => {
    try {
      const data = await BlockchainService.getBlockchainStats();
      res.json({
        latestBlock: data.latestBlock,
        totalTransactions: data.totalTransactions,
        source: data.source
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch blockchain stats" });
    }
  });

  app.get("/api/paxeer/address/:address/balance", async (req, res) => {
    try {
      const { address } = req.params;
      const data = await BlockchainService.getAddressBalance(address);
      res.json({
        address: data.address,
        balance: data.balance,
        source: data.source
      });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ error: "Failed to fetch address balance" });
    }
  });

  app.get("/api/paxeer/address/:address/transactions", async (req, res) => {
    try {
      const { address } = req.params;
      const data = await BlockchainService.getAddressTransactions(address);
      res.json({
        address: data.address,
        transactions: data.transactions,
        source: data.source
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch address transactions" });
    }
  });

  app.get("/api/paxeer/address/:address/tokens", async (req, res) => {
    try {
      const { address } = req.params;
      const data = await BlockchainService.getAddressTokens(address);
      res.json({
        address: data.address,
        tokens: data.tokens,
        source: data.source
      });
    } catch (error) {
      console.error("Error fetching tokens:", error);
      res.status(500).json({ error: "Failed to fetch address tokens" });
    }
  });

  app.get("/api/paxeer/address/:address/tokentransfers", async (req, res) => {
    try {
      const { address } = req.params;
      const data = await BlockchainService.getAddressTokenTransfers(address);
      res.json({
        address: data.address,
        transfers: data.transfers,
        source: data.source
      });
    } catch (error) {
      console.error("Error fetching token transfers:", error);
      res.status(500).json({ error: "Failed to fetch address token transfers" });
    }
  });

  // New consolidated profile endpoint for efficiency
  app.get("/api/paxeer/address/:address/profile", async (req, res) => {
    try {
      const { address } = req.params;
      const response = await fetch(`https://lending-api.paxeer.app/api/v1/profile/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch address profile" });
    }
  });

  // Transaction detail endpoint - using PaxScan API
  app.get("/api/paxeer/transaction/:hash", async (req, res) => {
    try {
      const { hash } = req.params;
      
      // Fetch transaction details from PaxScan
      const [transactionResponse, tokenTransfersResponse] = await Promise.all([
        fetch(`https://paxscan.paxeer.app/api/v2/transactions/${hash}`),
        fetch(`https://paxscan.paxeer.app/api/v2/transactions/${hash}/token-transfers`)
      ]);
      
      if (!transactionResponse.ok) {
        throw new Error('Failed to fetch transaction details');
      }
      
      const transaction = await transactionResponse.json();
      let tokenTransfers = null;
      
      // Token transfers might not exist for all transactions
      if (tokenTransfersResponse.ok) {
        tokenTransfers = await tokenTransfersResponse.json();
      }
      
      // Combine the data
      const combinedData = {
        ...transaction,
        token_transfers: tokenTransfers
      };
      
      res.json(combinedData);
    } catch (error) {
      console.error("Error fetching transaction details:", error);
      res.status(500).json({ error: "Failed to fetch transaction details" });
    }
  });

  // Lending activity tracking routes
  app.post("/api/lending/track", async (req, res) => {
    try {
      const { userAddress, transactionHash, action, tokenSymbol, tokenAddress, amount, tokenPrice } = req.body;
      
      // Check if transaction already exists to prevent duplicates
      const existingTransactions = await storage.getLendingTransactions(userAddress);
      const existingTx = existingTransactions.find(tx => tx.transactionHash === transactionHash);
      
      if (existingTx) {
        return res.json({ success: true, message: "Transaction already tracked" });
      }
      
      // Calculate USD value
      const usdValue = parseFloat(amount) * parseFloat(tokenPrice);
      
      // Record transaction
      const transactionData = {
        userAddress,
        transactionHash,
        action,
        tokenSymbol,
        tokenAddress,
        amount,
        usdValue: usdValue.toString(),
        tokenPrice,
      };
      
      await storage.createLendingTransaction(transactionData);
      
      // Update or create position
      const positions = await storage.getLendingPositions(userAddress);
      const existingPosition = positions.find(
        p => p.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() && 
             p.positionType === (action === 'deposit' || action === 'borrow' ? action : action === 'withdraw' ? 'deposit' : 'borrow')
      );
      
      let newAmount = parseFloat(amount);
      if (existingPosition) {
        const currentAmount = parseFloat(existingPosition.amount);
        if (action === 'withdraw' || action === 'repay') {
          newAmount = Math.max(0, currentAmount - newAmount);
        } else {
          newAmount = currentAmount + newAmount;
        }
        
        await storage.updateLendingPosition(
          userAddress, 
          tokenAddress, 
          existingPosition.positionType, 
          newAmount.toString(),
          (newAmount * parseFloat(tokenPrice)).toString()
        );
      } else if (action === 'deposit' || action === 'borrow') {
        await storage.createLendingPosition({
          userAddress,
          tokenSymbol,
          tokenAddress,
          positionType: action,
          amount: amount,
          usdValue: usdValue.toString(),
          tokenPrice,
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking lending activity:", error);
      
      // Handle duplicate transaction hash error gracefully
      if (error instanceof Error && error.message && error.message.includes('duplicate key')) {
        return res.json({ success: true, message: "Transaction already exists" });
      }
      
      res.status(500).json({ error: "Failed to track lending activity" });
    }
  });

  app.get("/api/lending/user/:address/corrected-data", async (req, res) => {
    try {
      const { address } = req.params;
      
      // Get positions from our tracking
      const positions = await storage.getLendingPositions(address);
      const transactions = await storage.getLendingTransactions(address);
      
      // Calculate corrected totals
      const totalBorrowed = await storage.calculateTotalBorrowed(address);
      const totalSupplied = await storage.calculateTotalSupplied(address);
      
      // Get current token prices for updated calculations
      const tokenPricesResponse = await fetch("https://dex-api.paxeer.app/api/tokens");
      const tokenPrices = tokenPricesResponse.ok ? await tokenPricesResponse.json() : [];
      
      // Recalculate based on current prices
      let updatedBorrowed = 0;
      let updatedSupplied = 0;
      
      for (const position of positions) {
        const currentToken = tokenPrices.find((t: any) => 
          t.symbol === position.tokenSymbol || 
          t.symbol === position.tokenSymbol.replace('W', '') ||
          (t.address && t.address.toLowerCase() === position.tokenAddress.toLowerCase())
        );
        
        const currentPrice = currentToken ? parseFloat(currentToken.price || 0) : parseFloat(position.tokenPrice);
        const positionValue = parseFloat(position.amount) * currentPrice;
        
        if (position.positionType === 'borrow') {
          updatedBorrowed += positionValue;
        } else {
          updatedSupplied += positionValue;
        }
      }
      
      // Fetch original API data for comparison
      let apiData = null;
      try {
        console.log(`Fetching credit score for address: ${address}`);
        const apiResponse = await fetch(`https://lending-api.paxeer.app/api/user/${address}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Paxeer-Wallet/1.0'
          }
        });
        
        if (apiResponse.ok) {
          apiData = await apiResponse.json();
          console.log(`Credit score API response for ${address}:`, apiData);
        } else {
          console.log(`Credit score API error for ${address}: ${apiResponse.status} ${apiResponse.statusText}`);
        }
      } catch (error) {
        console.error(`Failed to fetch credit score for ${address}:`, error);
      }
      
      res.json({
        correctedData: {
          totalBorrowed: updatedBorrowed,
          totalSupplied: updatedSupplied,
          borrowingPowerUsed: updatedBorrowed,
          positions: positions.map(p => ({
            ...p,
            currentPrice: tokenPrices.find((t: any) => 
              t.symbol === p.tokenSymbol || 
              t.symbol === p.tokenSymbol.replace('W', '') ||
              (t.address && t.address.toLowerCase() === p.tokenAddress.toLowerCase())
            )?.price || p.tokenPrice
          }))
        },
        apiData,
        transactions,
        hasTrackedData: positions.length > 0
      });
    } catch (error) {
      console.error("Error fetching corrected lending data:", error);
      res.status(500).json({ error: "Failed to fetch corrected lending data" });
    }
  });

  // Swap tracking routes
  app.post("/api/swaps/track", async (req, res) => {
    try {
      const swapData = insertSwapTransactionSchema.parse(req.body);
      
      // Check if swap already exists to prevent duplicates
      const existingSwaps = await storage.getSwapTransactions(swapData.userAddress);
      const existingSwap = existingSwaps.find(swap => swap.transactionHash === swapData.transactionHash);
      
      if (existingSwap) {
        return res.json({ success: true, message: "Swap already tracked" });
      }
      
      const swap = await storage.createSwapTransaction(swapData);
      res.status(201).json({ success: true, swap });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid swap data", details: error.errors });
      }
      console.error("Error tracking swap:", error);
      res.status(500).json({ error: "Failed to track swap" });
    }
  });

  // IMPORTANT: Specific routes must come BEFORE parameter routes!
  app.get("/api/swaps/global/stats", async (req, res) => {
    try {
      const stats = await storage.getAllSwapStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching global swap stats:", error);
      res.status(500).json({ error: "Failed to fetch global swap stats" });
    }
  });

  // Parameter routes come AFTER specific routes
  app.get("/api/swaps/:userAddress", async (req, res) => {
    try {
      const { userAddress } = req.params;
      const swaps = await storage.getSwapTransactions(userAddress);
      res.json(swaps);
    } catch (error) {
      console.error("Error fetching user swaps:", error);
      res.status(500).json({ error: "Failed to fetch user swaps" });
    }
  });

  app.get("/api/swaps/:userAddress/stats", async (req, res) => {
    try {
      const { userAddress } = req.params;
      const stats = await storage.getSwapStats(userAddress);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user swap stats:", error);
      res.status(500).json({ error: "Failed to fetch user swap stats" });
    }
  });

  // Reward system routes
  
  // Lessons
  app.get("/api/rewards/lessons", async (req, res) => {
    try {
      const lessons = await storage.getLessons();
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ error: "Failed to fetch lessons" });
    }
  });

  app.get("/api/rewards/lessons/:id", async (req, res) => {
    try {
      const lesson = await storage.getLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      res.status(500).json({ error: "Failed to fetch lesson" });
    }
  });

  app.post("/api/rewards/lessons", async (req, res) => {
    try {
      const lessonData = insertLessonSchema.parse(req.body);
      const lesson = await storage.createLesson(lessonData);
      res.status(201).json(lesson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid lesson data", details: error.errors });
      }
      console.error("Error creating lesson:", error);
      res.status(500).json({ error: "Failed to create lesson" });
    }
  });

  // Daily tasks
  app.get("/api/rewards/daily-tasks", async (req, res) => {
    try {
      const tasks = await storage.getDailyTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching daily tasks:", error);
      res.status(500).json({ error: "Failed to fetch daily tasks" });
    }
  });

  app.post("/api/rewards/daily-tasks", async (req, res) => {
    try {
      const taskData = insertDailyTaskSchema.parse(req.body);
      const task = await storage.createDailyTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid task data", details: error.errors });
      }
      console.error("Error creating daily task:", error);
      res.status(500).json({ error: "Failed to create daily task" });
    }
  });

  // User progress and rewards
  app.get("/api/rewards/user/:address/progress", async (req, res) => {
    try {
      const { address } = req.params;
      const progress = await storage.getUserProgress(address);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching user progress:", error);
      res.status(500).json({ error: "Failed to fetch user progress" });
    }
  });

  app.post("/api/rewards/user/:address/complete-lesson", async (req, res) => {
    try {
      const { address } = req.params;
      const { lessonId } = req.body;

      // Check if lesson exists
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      // Check if already completed
      const existingProgress = await storage.getUserLessonProgress(address, lessonId);
      if (existingProgress && existingProgress.completed) {
        return res.status(400).json({ error: "Lesson already completed" });
      }

      // Get or create user stats
      let userStats = await storage.getUserStats(address);
      if (!userStats) {
        userStats = await storage.createUserStats({
          userAddress: address,
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

      // Calculate XP reward based on difficulty
      let xpReward = 50; // base XP
      switch (lesson.difficulty) {
        case "beginner": xpReward = 50; break;
        case "intermediate": xpReward = 75; break;
        case "advanced": xpReward = 100; break;
      }

      const newXP = parseInt(userStats.xp) + xpReward;
      const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
      const currentLevel = parseInt(userStats.level);
      const levelUp = newLevel > currentLevel;
      const newLessonsCompleted = parseInt(userStats.lessonsCompleted) + 1;

      // Update user stats
      await storage.updateUserStats(address, {
        level: newLevel.toString(),
        xp: newXP.toString(),
        lessonsCompleted: newLessonsCompleted.toString(),
        totalEarned: (parseFloat(userStats.totalEarned) + parseFloat(lesson.rewardAmount)).toString(),
        lastActivity: new Date(),
        updatedAt: new Date()
      });

      // Create progress record
      const progress = await storage.createUserProgress({
        userAddress: address,
        lessonId,
        completed: true,
        completedAt: new Date(),
        xpAwarded: xpReward.toString()
      });

      // Create reward transaction
      const rewardTransaction = await storage.createRewardTransaction({
        userAddress: address,
        rewardType: "lesson",
        rewardId: lessonId,
        amount: lesson.rewardAmount,
        status: "pending"
      });

      // Check for new achievements based on updated stats
      const achievements = await storage.getAchievements();
      const userAchievements = await storage.getUserAchievements(address);
      const unlockedAchievementIds = userAchievements.map(ua => ua.achievementId);
      
      const newlyUnlocked = [];
      for (const achievement of achievements) {
        if (unlockedAchievementIds.includes(achievement.id)) continue;
        
        const requirement = JSON.parse(achievement.requirement);
        let shouldUnlock = false;
        
        switch (requirement.type) {
          case 'lessons_completed':
            shouldUnlock = newLessonsCompleted >= requirement.value;
            break;
          case 'level_reached':
            shouldUnlock = newLevel >= requirement.value;
            break;
          case 'all_lessons_completed':
            const totalLessons = await storage.getLessons();
            shouldUnlock = newLessonsCompleted >= totalLessons.length;
            break;
        }
        
        if (shouldUnlock) {
          await storage.createUserAchievement({
            userAddress: address,
            achievementId: achievement.id,
            unlockedAt: new Date(),
            xpAwarded: achievement.rewardXp || "0"
          });
          
          newlyUnlocked.push({
            id: achievement.id,
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon
          });
        }
      }

      res.json({ 
        progress, 
        rewardTransaction, 
        xpAwarded: xpReward,
        levelUp,
        newLevel: levelUp ? newLevel : undefined,
        newAchievements: newlyUnlocked
      });
    } catch (error) {
      console.error("Error completing lesson:", error);
      res.status(500).json({ error: "Failed to complete lesson" });
    }
  });

  // Daily check-in
  app.post("/api/rewards/user/:address/checkin", async (req, res) => {
    try {
      const { address } = req.params;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Check if already checked in today
      const existingCheckin = await storage.getDailyCheckin(address, today);
      if (existingCheckin) {
        return res.status(400).json({ error: "Already checked in today" });
      }

      // Get consecutive days count
      const consecutiveDays = await storage.getConsecutiveCheckins(address) + 1;
      
      // Calculate reward based on consecutive days (0.01 PAX base + 0.001 PAX per consecutive day)
      // Use simple 2-decimal amounts for database storage
      const baseReward = 0.01;
      const bonusReward = consecutiveDays * 0.001;
      const totalReward = Number((baseReward + bonusReward).toFixed(2));

      // Create check-in record
      const checkin = await storage.createDailyCheckin({
        userAddress: address,
        date: today,
        rewardAmount: totalReward.toString(),
        consecutiveDays: consecutiveDays.toString()
      });

      // Create reward transaction
      const rewardTransaction = await storage.createRewardTransaction({
        userAddress: address,
        rewardType: "checkin",
        rewardId: checkin.id,
        amount: totalReward.toString(),
        status: "pending"
      });

      res.json({ checkin, rewardTransaction, consecutiveDays });
    } catch (error) {
      console.error("Error processing check-in:", error);
      res.status(500).json({ error: "Failed to process check-in" });
    }
  });

  // Get user daily tasks for today
  app.get("/api/rewards/user/:address/daily-tasks", async (req, res) => {
    try {
      const { address } = req.params;
      const today = new Date().toISOString().split('T')[0];
      
      const allTasks = await storage.getDailyTasks();
      const userTasks = await storage.getUserDailyTasks(address, today);
      
      // Combine task definitions with user progress
      const tasksWithProgress = allTasks.map(task => {
        const userTask = userTasks.find(ut => ut.taskId === task.id);
        return {
          ...task,
          userProgress: userTask ? {
            completed: userTask.completed,
            progress: userTask.progress,
            rewardClaimed: userTask.rewardClaimed
          } : {
            completed: false,
            progress: "0",
            rewardClaimed: false
          }
        };
      });

      res.json(tasksWithProgress);
    } catch (error) {
      console.error("Error fetching user daily tasks:", error);
      res.status(500).json({ error: "Failed to fetch user daily tasks" });
    }
  });

  // Track task progress
  app.post("/api/rewards/user/:address/track-task", async (req, res) => {
    try {
      const { address } = req.params;
      const { taskId, progress = "1" } = req.body;
      const today = new Date().toISOString().split('T')[0];

      const task = await storage.getDailyTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Get or create user task
      let userTask = await storage.getUserDailyTask(address, taskId, today);
      
      if (!userTask) {
        userTask = await storage.createUserDailyTask({
          userAddress: address,
          taskId,
          date: today,
          completed: false,
          progress
        });
      }

      // Update progress
      const newProgress = parseInt(progress);
      const targetValue = parseInt(task.targetValue || "1");
      const completed = newProgress >= targetValue;

      const updatedTask = await storage.updateUserDailyTask(userTask.id, {
        progress: newProgress.toString(),
        completed,
        completedAt: completed ? new Date() : undefined
      });

      // Create reward transaction if completed and not already rewarded
      if (completed && !userTask.rewardClaimed) {
        const rewardTransaction = await storage.createRewardTransaction({
          userAddress: address,
          rewardType: "daily_task",
          rewardId: taskId,
          amount: task.rewardAmount,
          status: "pending"
        });

        return res.json({ userTask: updatedTask, rewardTransaction });
      }

      res.json({ userTask: updatedTask });
    } catch (error) {
      console.error("Error tracking task progress:", error);
      res.status(500).json({ error: "Failed to track task progress" });
    }
  });

  // Get reward transactions
  app.get("/api/rewards/user/:address/transactions", async (req, res) => {
    try {
      const { address } = req.params;
      const transactions = await storage.getRewardTransactions(address);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching reward transactions:", error);
      res.status(500).json({ error: "Failed to fetch reward transactions" });
    }
  });

  // Gamified rewards endpoints
  
  // Get user stats and achievements
  app.get("/api/rewards/user/:address/stats", async (req, res) => {
    try {
      const { address } = req.params;
      
      // Get or create user stats
      let userStats = await storage.getUserStats(address);
      if (!userStats) {
        userStats = await storage.createUserStats({
          userAddress: address,
          level: "1",
          xp: "0",
          totalEarned: "0",
          streak: "0",
          lessonsCompleted: "0"
        });
      }

      // Get user achievements with full details
      const userAchievements = await storage.getUserAchievements(address);
      const allAchievements = await storage.getAchievements();
      
      const achievements = allAchievements.map(achievement => {
        const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
        return {
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          unlocked: !!userAchievement,
          unlockedAt: userAchievement?.unlockedAt || null,
          requirement: JSON.parse(achievement.requirement || '{}')
        };
      });
      
      // Calculate level and XP to next level using the same formula as gamification routes
      const currentXp = parseInt(userStats.xp);
      const currentLevel = Math.floor(Math.sqrt(currentXp / 100)) + 1;
      const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 100;
      const xpForNextLevel = Math.pow(currentLevel, 2) * 100;
      const xpProgress = currentXp - xpForCurrentLevel;
      const xpNeeded = xpForNextLevel - xpForCurrentLevel;

      res.json({
        level: currentLevel,
        xp: currentXp,
        xpToNextLevel: xpNeeded - xpProgress,
        xpProgress,
        progressPercentage: Math.round((xpProgress / xpNeeded) * 100),
        totalEarned: userStats.totalEarned,
        streak: parseInt(userStats.streak),
        lessonsCompleted: parseInt(userStats.lessonsCompleted),
        achievements
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // Get daily challenges
  app.get("/api/rewards/user/:address/daily-challenges", async (req, res) => {
    try {
      const { address } = req.params;
      const today = new Date().toISOString().split('T')[0];
      
      // Get active daily challenges
      const challenges = await storage.getDailyChallenges();
      const userChallenges = await storage.getUserChallenges(address, today);
      
      // Combine with user progress
      const challengesWithProgress = challenges.map(challenge => {
        const userChallenge = userChallenges.find(uc => uc.challengeId === challenge.id);
        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          rewardAmount: challenge.rewardAmount,
          xpReward: parseInt(challenge.xpReward),
          target: parseInt(challenge.target),
          progress: userChallenge ? parseInt(userChallenge.progress) : 0,
          completed: userChallenge ? userChallenge.completed : false,
          expiresAt: userChallenge ? userChallenge.expiresAt : new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
      });

      res.json(challengesWithProgress);
    } catch (error) {
      console.error("Error fetching daily challenges:", error);
      res.status(500).json({ error: "Failed to fetch daily challenges" });
    }
  });

  // Enhanced lesson completion with XP and achievement checking
  app.post("/api/rewards/user/:address/complete-lesson", async (req, res) => {
    try {
      const { address } = req.params;
      const { lessonId } = req.body;

      // Check if lesson exists
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      // Check if already completed
      const existingProgress = await storage.getUserLessonProgress(address, lessonId);
      if (existingProgress) {
        return res.status(400).json({ error: "Lesson already completed" });
      }

      // Get user stats
      let userStats = await storage.getUserStats(address);
      if (!userStats) {
        userStats = await storage.createUserStats({
          userAddress: address,
          level: "1",
          xp: "0",
          totalEarned: "0",
          streak: "0",
          lessonsCompleted: "0"
        });
      }

      // Calculate XP reward based on difficulty
      let xpReward = 50; // base XP
      switch (lesson.difficulty) {
        case "beginner": xpReward = 50; break;
        case "intermediate": xpReward = 75; break;
        case "advanced": xpReward = 100; break;
      }

      const newXP = parseInt(userStats.xp) + xpReward;
      const newLevel = Math.floor(newXP / 100) + 1;
      const currentLevel = parseInt(userStats.level);
      const levelUp = newLevel > currentLevel;
      const newLessonsCompleted = parseInt(userStats.lessonsCompleted) + 1;

      // Update user stats
      await storage.updateUserStats(address, {
        level: newLevel.toString(),
        xp: newXP.toString(),
        lessonsCompleted: newLessonsCompleted.toString(),
        totalEarned: (parseFloat(userStats.totalEarned) + parseFloat(lesson.rewardAmount)).toString()
      });

      // Create progress record
      const progress = await storage.createUserProgress({
        userAddress: address,
        lessonId,
        rewardClaimed: false
      });

      // Create reward transaction
      const rewardTransaction = await storage.createRewardTransaction({
        userAddress: address,
        rewardType: "lesson",
        rewardId: lessonId,
        amount: lesson.rewardAmount,
        status: "pending"
      });

      // Check for achievements
      const newAchievements = await storage.checkAndAwardAchievements(address, {
        type: 'lesson_completed',
        lessonsCompleted: newLessonsCompleted,
        level: newLevel
      });

      res.json({
        progress,
        rewardTransaction,
        xp: xpReward,
        levelUp,
        newLevel: levelUp ? newLevel : undefined,
        achievements: newAchievements
      });
    } catch (error) {
      console.error("Error completing lesson:", error);
      res.status(500).json({ error: "Failed to complete lesson" });
    }
  });

  // Enhanced daily check-in with XP and streak bonuses
  app.post("/api/rewards/user/:address/checkin", async (req, res) => {
    try {
      const { address } = req.params;
      const today = new Date().toISOString().split('T')[0];

      // Check if already checked in today
      const existingCheckin = await storage.getDailyCheckin(address, today);
      if (existingCheckin) {
        return res.status(400).json({ error: "Already checked in today" });
      }

      // Get user stats
      let userStats = await storage.getUserStats(address);
      if (!userStats) {
        userStats = await storage.createUserStats({
          userAddress: address,
          level: "1",
          xp: "0",
          totalEarned: "0",
          streak: "0",
          lessonsCompleted: "0"
        });
      }

      // Calculate streak
      const consecutiveDays = await storage.getConsecutiveCheckins(address) + 1;
      
      // Calculate rewards (PAX + XP based on streak)
      const baseReward = ethers.parseUnits("0.01", 18);
      const bonusReward = ethers.parseUnits((consecutiveDays * 0.001).toString(), 18);
      const totalReward = baseReward + bonusReward;
      
      const baseXP = 10;
      const streakXP = Math.min(consecutiveDays * 2, 50); // Cap at 50 XP
      const totalXP = baseXP + streakXP;

      const newXP = parseInt(userStats.xp) + totalXP;
      const newLevel = Math.floor(newXP / 100) + 1;
      const currentLevel = parseInt(userStats.level);
      const levelUp = newLevel > currentLevel;

      // Update user stats
      await storage.updateUserStats(address, {
        level: newLevel.toString(),
        xp: newXP.toString(),
        streak: consecutiveDays.toString(),
        totalEarned: (parseFloat(userStats.totalEarned) + parseFloat(ethers.formatUnits(totalReward, 18))).toString(),
        lastCheckIn: new Date()
      });

      // Create check-in record
      const checkin = await storage.createDailyCheckin({
        userAddress: address,
        date: today,
        rewardAmount: totalReward.toString(),
        consecutiveDays: consecutiveDays.toString()
      });

      // Create reward transaction
      const rewardTransaction = await storage.createRewardTransaction({
        userAddress: address,
        rewardType: "checkin",
        rewardId: checkin.id,
        amount: totalReward.toString(),
        status: "pending"
      });

      // Check for streak achievements
      const newAchievements = await storage.checkAndAwardAchievements(address, {
        type: 'daily_streak',
        streak: consecutiveDays,
        level: newLevel
      });

      res.json({
        checkin,
        rewardTransaction,
        consecutiveDays,
        xp: totalXP,
        streak: consecutiveDays,
        levelUp,
        newLevel: levelUp ? newLevel : undefined,
        achievements: newAchievements
      });
    } catch (error) {
      console.error("Error processing check-in:", error);
      res.status(500).json({ error: "Failed to process check-in" });
    }
  });

  // Track user actions for challenge progress and achievements
  app.post("/api/rewards/track-action", async (req, res) => {
    try {
      const { userAddress, action, metadata = {} } = req.body;

      if (!userAddress || !action) {
        return res.status(400).json({ error: "userAddress and action are required" });
      }

      // Update challenge progress based on action
      await storage.updateChallengeProgress(userAddress, action);

      // Check for achievements
      const newAchievements = await storage.checkAndAwardAchievements(userAddress, {
        type: action,
        ...metadata
      });

      res.json({ success: true, achievements: newAchievements });
    } catch (error) {
      console.error("Error tracking user action:", error);
      res.status(500).json({ error: "Failed to track user action" });
    }
  });

  // Update challenge progress
  app.post("/api/rewards/user/:address/challenge-progress", async (req, res) => {
    try {
      const { address } = req.params;
      const { challengeType, increment = 1 } = req.body;
      const today = new Date().toISOString().split('T')[0];

      // Get challenge by type
      const challenge = await storage.getDailyChallengeByType(challengeType);
      if (!challenge) {
        return res.json({ success: true, message: "Challenge type not found" });
      }

      // Get or create user challenge
      let userChallenge = await storage.getUserChallenge(address, challenge.id, today);
      if (!userChallenge) {
        userChallenge = await storage.createUserChallenge({
          userAddress: address,
          challengeId: challenge.id,
          date: today,
          progress: "0",
          completed: false,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      }

      // Update progress
      const newProgress = parseInt(userChallenge.progress) + increment;
      const target = parseInt(challenge.target);
      const completed = newProgress >= target;

      await storage.updateUserChallenge(userChallenge.id, {
        progress: newProgress.toString(),
        completed,
        completedAt: completed ? new Date() : undefined
      });

      // Award rewards if completed
      if (completed && !userChallenge.rewardClaimed) {
        // Update user stats with XP
        const userStats = await storage.getUserStats(address);
        if (userStats) {
          const newXP = parseInt(userStats.xp) + parseInt(challenge.xpReward);
          const newLevel = Math.floor(newXP / 100) + 1;
          const levelUp = newLevel > parseInt(userStats.level);

          await storage.updateUserStats(address, {
            level: newLevel.toString(),
            xp: newXP.toString(),
            totalEarned: (parseFloat(userStats.totalEarned) + parseFloat(challenge.rewardAmount)).toString()
          });

          // Create reward transaction
          const rewardTransaction = await storage.createRewardTransaction({
            userAddress: address,
            rewardType: "daily_challenge",
            rewardId: challenge.id,
            amount: challenge.rewardAmount,
            status: "pending"
          });

          return res.json({
            success: true,
            completed,
            progress: newProgress,
            target,
            rewardTransaction,
            xp: parseInt(challenge.xpReward),
            levelUp,
            newLevel: levelUp ? newLevel : undefined
          });
        }
      }

      res.json({
        success: true,
        completed,
        progress: newProgress,
        target
      });
    } catch (error) {
      console.error("Error updating challenge progress:", error);
      res.status(500).json({ error: "Failed to update challenge progress" });
    }
  });

  // Initialize server wallet (admin endpoint)
  app.post("/api/rewards/admin/init-wallet", async (req, res) => {
    try {
      const { privateKey } = req.body;
      
      if (!privateKey) {
        return res.status(400).json({ error: "Private key required" });
      }

      // Get wallet address from private key
      const wallet = new ethers.Wallet(privateKey);
      const address = wallet.address;

      // Check if wallet already exists
      const existingWallet = await storage.getServerWallet();
      if (existingWallet) {
        return res.status(400).json({ error: "Server wallet already initialized" });
      }

      // Create server wallet
      const serverWallet = await storage.createServerWallet({
        address,
        privateKey,
        balance: "0"
      });

      res.json({ address: serverWallet.address });
    } catch (error) {
      console.error("Error initializing server wallet:", error);
      res.status(500).json({ error: "Failed to initialize server wallet" });
    }
  });

  // Clear all lessons (admin endpoint)
  app.delete("/api/rewards/admin/clear-lessons", async (req, res) => {
    try {
      await storage.clearAllLessons();
      res.json({ message: "All lessons cleared" });
    } catch (error) {
      console.error("Error clearing lessons:", error);
      res.status(500).json({ message: "Failed to clear lessons" });
    }
  });

  // Proxy routes for mobile APK - route external API calls through our server
  // New PaxLend v1 API proxy routes
  app.get("/api/proxy/lending/v1/vaults", async (req, res) => {
    try {
      console.log('Proxying request to PaxLend v1 vaults API...');
      const response = await fetch("https://lending-api.paxeer.app/api/v1/vaults");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching PaxLend vaults:", error);
      res.status(500).json({ error: "Failed to fetch vaults data" });
    }
  });

  app.get("/api/proxy/lending/v1/vaults/:vaultId", async (req, res) => {
    try {
      const { vaultId } = req.params;
      console.log(`Proxying request to PaxLend v1 vault detail API for ${vaultId}...`);
      const response = await fetch(`https://lending-api.paxeer.app/api/v1/vaults/${vaultId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(`Error fetching PaxLend vault ${req.params.vaultId}:`, error);
      res.status(500).json({ error: "Failed to fetch vault details" });
    }
  });

  app.get("/api/proxy/lending/v1/user/:address/credit", async (req, res) => {
    try {
      const { address } = req.params;
      console.log(`Proxying request to PaxLend v1 user credit API for ${address}...`);
      const response = await fetch(`https://lending-api.paxeer.app/api/v1/user/${address}/credit`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(`Error fetching user credit for ${req.params.address}:`, error);
      res.status(500).json({ error: "Failed to fetch user credit data" });
    }
  });

  app.get("/api/proxy/lending/v1/protocol/stats", async (req, res) => {
    try {
      console.log('Proxying request to PaxLend v1 protocol stats API...');
      const response = await fetch("https://lending-api.paxeer.app/api/v1/protocol/stats");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching protocol stats:", error);
      res.status(500).json({ error: "Failed to fetch protocol statistics" });
    }
  });

  // Legacy lending pools proxy (kept for compatibility)
  app.get("/api/proxy/lending/pools", async (req, res) => {
    try {
      const response = await fetch("https://lending-api.paxeer.app/api/pools");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying lending pools:", error);
      res.status(500).json({ error: "Failed to fetch lending pools" });
    }
  });

  // PaxDex Protocol API proxy routes
  app.get("/api/proxy/swap/tokens", async (req, res) => {
    try {
      const response = await fetch("https://dex-api.paxeer.app/api/tokens/swap");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying swap tokens:", error);
      res.status(500).json({ error: "Failed to fetch swap tokens" });
    }
  });

  app.get("/api/proxy/swap/prices", async (req, res) => {
    try {
      const response = await fetch("https://dex-api.paxeer.app/api/prices");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying token prices:", error);
      res.status(500).json({ error: "Failed to fetch token prices" });
    }
  });

  app.get("/api/proxy/swap/prices/:address", async (req, res) => {
    try {
      const response = await fetch(`https://dex-api.paxeer.app/api/prices/${req.params.address}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying token price:", error);
      res.status(500).json({ error: "Failed to fetch token price" });
    }
  });

  app.get("/api/proxy/swap/prices/:address/history", async (req, res) => {
    try {
      const { timeframe = '24h', limit = 100 } = req.query;
      const response = await fetch(`https://dex-api.paxeer.app/api/prices/${req.params.address}/history?timeframe=${timeframe}&limit=${limit}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying price history:", error);
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });

  app.get("/api/proxy/swap/health", async (req, res) => {
    try {
      const response = await fetch("https://dex-api.paxeer.app/api/health");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying health check:", error);
      res.status(500).json({ error: "Failed to check API health" });
    }
  });

  app.get("/api/proxy/swap/status", async (req, res) => {
    try {
      const response = await fetch("https://dex-api.paxeer.app/api/status");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying system status:", error);
      res.status(500).json({ error: "Failed to fetch system status" });
    }
  });

  // Additional PaxDex trading proxy routes
  app.get("/api/proxy/swap/transactions", async (req, res) => {
    try {
      const response = await fetch("https://dex-api.paxeer.app/api/trades/recent");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying recent transactions:", error);
      res.status(500).json({ error: "Failed to fetch recent transactions" });
    }
  });

  app.post("/api/proxy/swap/execute", async (req, res) => {
    try {
      const response = await fetch("https://dex-api.paxeer.app/api/trades/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Wallet-Type": "paxeer-mobile"
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying trade execution:", error);
      res.status(500).json({ error: "Failed to execute trade" });
    }
  });

  app.get("/api/proxy/swap/quote", async (req, res) => {
    try {
      const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
      const response = await fetch(`https://dex-api.paxeer.app/api/quote?${queryString}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying swap quote:", error);
      res.status(500).json({ error: "Failed to get swap quote" });
    }
  });

  app.get("/api/proxy/swap/orderbook/:pair", async (req, res) => {
    try {
      const { pair } = req.params;
      const response = await fetch(`https://dex-api.paxeer.app/api/orderbook/${pair}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying orderbook:", error);
      res.status(500).json({ error: "Failed to fetch orderbook" });
    }
  });

  // Options trading routes
  const optionsService = OptionsService.getInstance();
  
  // Initialize options assets on startup
  optionsService.initializeAssets().then(() => {
    console.log('Options assets initialized');
    // Start periodic sync
    optionsService.startSync(60); // Sync every 60 seconds as per API docs
  }).catch(err => {
    console.error('Failed to initialize options assets:', err);
  });
  
  // Get all options assets
  app.get("/api/options/assets", async (req, res) => {
    try {
      const assets = await optionsService.getAllAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching options assets:", error);
      res.status(500).json({ error: "Failed to fetch options assets" });
    }
  });
  
  // Get options chain for specific asset
  app.get("/api/options/chain/:tokenAddress", async (req, res) => {
    try {
      const { tokenAddress } = req.params;
      const rawChain = await optionsService.getOptionsChainForAsset(tokenAddress);
      
      // Organize data by expiry date, then by strike price
      const organizedChain: Record<string, Array<{
        strike: number;
        call: { premium: number; iv: number };
        put: { premium: number; iv: number };
      }>> = {};
      
      // Group by expiry
      const expiryGroups: Record<string, typeof rawChain> = {};
      rawChain.forEach(option => {
        const expiryKey = option.expiry.toISOString();
        if (!expiryGroups[expiryKey]) {
          expiryGroups[expiryKey] = [];
        }
        expiryGroups[expiryKey].push(option);
      });
      
      // Process each expiry group
      Object.entries(expiryGroups).forEach(([expiry, options]) => {
        const strikes: Record<string, {
          strike: number;
          call: { premium: number; iv: number };
          put: { premium: number; iv: number };
        }> = {};
        
        // Group by strike price
        options.forEach(option => {
          const strike = parseFloat(option.strikePrice);
          const strikeKey = strike.toString();
          
          if (!strikes[strikeKey]) {
            strikes[strikeKey] = {
              strike,
              call: { premium: 0, iv: 0 },
              put: { premium: 0, iv: 0 }
            };
          }
          
          // Add call and put data
          strikes[strikeKey].call.premium = parseFloat(option.callPremium);
          strikes[strikeKey].call.iv = parseFloat(option.callIv);
          strikes[strikeKey].put.premium = parseFloat(option.putPremium);
          strikes[strikeKey].put.iv = parseFloat(option.putIv);
        });
        
        // Sort strikes numerically and convert to array
        organizedChain[expiry] = Object.values(strikes)
          .sort((a, b) => a.strike - b.strike)
          .filter(strike => strike.call.premium > 0 || strike.put.premium > 0); // Only include strikes with data
      });
      
      res.json(organizedChain);
    } catch (error) {
      console.error("Error fetching options chain:", error);
      res.status(500).json({ error: "Failed to fetch options chain" });
    }
  });
  
  // Manual sync trigger (admin endpoint)
  app.post("/api/options/admin/sync", async (req, res) => {
    try {
      await optionsService.syncOptionsChains();
      res.json({ message: "Options chains synced successfully" });
    } catch (error) {
      console.error("Error syncing options chains:", error);
      res.status(500).json({ error: "Failed to sync options chains" });
    }
  });


  const httpServer = createServer(app);
  

  return httpServer;
}
