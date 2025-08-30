import { ethers } from "ethers";
import { storage } from "../storage";

const PAXEER_RPC_URL = "https://rpc-paxeer-network-djjz47ii4b.t.conduit.xyz/DgdWRnqiV7UGiMR2s9JPMqto415SW9tNG";

export class RewardService {
  static async processRewards() {
    try {
      console.log("Processing pending reward transactions...");
      
      // Get server wallet
      const serverWallet = await storage.getServerWallet();
      if (!serverWallet) {
        console.error("Server wallet not initialized");
        return;
      }

      // Get pending transactions
      const pendingTransactions = await storage.getPendingRewardTransactions();
      console.log(`Found ${pendingTransactions.length} pending reward transactions`);

      if (pendingTransactions.length === 0) {
        return;
      }

      // Initialize provider and wallet
      const provider = new ethers.JsonRpcProvider(PAXEER_RPC_URL);
      const wallet = new ethers.Wallet(serverWallet.privateKey, provider);

      // Update server wallet balance
      const balance = await provider.getBalance(wallet.address);
      await storage.updateServerWalletBalance(balance.toString());

      for (const rewardTx of pendingTransactions) {
        try {
          console.log(`Processing reward for ${rewardTx.userAddress}: ${ethers.formatEther(rewardTx.amount)} PAX`);

          // Check if server has enough balance
          const currentBalance = await provider.getBalance(wallet.address);
          const rewardAmount = BigInt(rewardTx.amount);
          const gasEstimate = ethers.parseUnits("0.001", 18); // Estimate 0.001 PAX for gas

          if (currentBalance < rewardAmount + gasEstimate) {
            console.error(`Insufficient balance for reward ${rewardTx.id}. Need: ${ethers.formatEther(rewardAmount + gasEstimate)} PAX, Have: ${ethers.formatEther(currentBalance)} PAX`);
            continue;
          }

          // Send PAX tokens
          const tx = await wallet.sendTransaction({
            to: rewardTx.userAddress,
            value: rewardAmount,
            gasLimit: 21000,
          });

          console.log(`Sent reward transaction: ${tx.hash}`);

          // Update reward transaction status
          await storage.updateRewardTransaction(rewardTx.id, {
            status: "sent",
            transactionHash: tx.hash,
            sentAt: new Date()
          });

          // Mark user progress as claimed if it's a lesson reward
          if (rewardTx.rewardType === "lesson" && rewardTx.rewardId) {
            const progress = await storage.getUserLessonProgress(rewardTx.userAddress, rewardTx.rewardId);
            if (progress) {
              await storage.updateUserProgress(progress.id, {
                rewardClaimed: true,
                claimedAt: new Date()
              });
            }
          }

          // Mark daily task as claimed if it's a daily task reward
          if (rewardTx.rewardType === "daily_task" && rewardTx.rewardId) {
            const today = new Date().toISOString().split('T')[0];
            const userTask = await storage.getUserDailyTask(rewardTx.userAddress, rewardTx.rewardId, today);
            if (userTask) {
              await storage.updateUserDailyTask(userTask.id, {
                rewardClaimed: true,
                claimedAt: new Date()
              });
            }
          }

          console.log(`Successfully processed reward ${rewardTx.id}`);

        } catch (error) {
          console.error(`Failed to process reward ${rewardTx.id}:`, error);
          
          // Mark as failed
          await storage.updateRewardTransaction(rewardTx.id, {
            status: "failed"
          });
        }
      }

      // Update final balance
      const finalBalance = await provider.getBalance(wallet.address);
      await storage.updateServerWalletBalance(finalBalance.toString());

      console.log("Reward processing completed");

    } catch (error) {
      console.error("Error in reward processing:", error);
    }
  }

  static async trackUserActivity(userAddress: string, activityType: string, metadata?: any) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tasks = await storage.getDailyTasks();

      for (const task of tasks) {
        if (task.taskType === activityType) {
          // Check if user already has this task for today
          let userTask = await storage.getUserDailyTask(userAddress, task.id, today);
          
          if (!userTask) {
            userTask = await storage.createUserDailyTask({
              userAddress,
              taskId: task.id,
              date: today,
              completed: false,
              progress: "0"
            });
          }

          if (userTask.completed) {
            continue; // Task already completed
          }

          // Update progress
          const currentProgress = parseInt(userTask.progress);
          const newProgress = currentProgress + 1;
          const targetValue = parseInt(task.targetValue || "1");
          const completed = newProgress >= targetValue;

          await storage.updateUserDailyTask(userTask.id, {
            progress: newProgress.toString(),
            completed,
            completedAt: completed ? new Date() : undefined
          });

          // Create reward if completed
          if (completed) {
            await storage.createRewardTransaction({
              userAddress,
              rewardType: "daily_task",
              rewardId: task.id,
              amount: task.rewardAmount,
              status: "pending"
            });

            console.log(`User ${userAddress} completed daily task: ${task.title}`);
          }
        }
      }
    } catch (error) {
      console.error("Error tracking user activity:", error);
    }
  }

  static startRewardProcessor() {
    // Process rewards every 30 seconds
    setInterval(() => {
      this.processRewards();
    }, 30000);

    console.log("Reward processor started - processing every 30 seconds");
  }
}