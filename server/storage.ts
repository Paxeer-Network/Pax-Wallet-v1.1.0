import { type User, type InsertUser, type Account, type InsertAccount, type Transaction, type InsertTransaction, type Token, type InsertToken, type LendingPosition, type InsertLendingPosition, type LendingTransaction, type InsertLendingTransaction, type Lesson, type InsertLesson, type DailyTask, type InsertDailyTask, type UserProgress, type InsertUserProgress, type UserDailyTask, type InsertUserDailyTask, type DailyCheckin, type InsertDailyCheckin, type RewardTransaction, type InsertRewardTransaction, type ServerWallet, type InsertServerWallet, type UserStats, type InsertUserStats, type Achievement, type InsertAchievement, type UserAchievement, type InsertUserAchievement, type DailyChallenge, type InsertDailyChallenge, type UserChallenge, type InsertUserChallenge, type OptionsAsset, type InsertOptionsAsset, type OptionsChain, type InsertOptionsChain, type OptionsApiLog, type InsertOptionsApiLog, type SwapTransaction, type InsertSwapTransaction, type LaunchPool, type InsertLaunchPool, type LaunchTokenHolding, type InsertLaunchTokenHolding, type LaunchTokenComment, type InsertLaunchTokenComment, type LaunchTokenTrade, type InsertLaunchTokenTrade, users, accounts, transactions, tokens, lendingPositions, lendingTransactions, lessons, dailyTasks, userProgress, userDailyTasks, dailyCheckins, rewardTransactions, serverWallet, userStats, achievements, userAchievements, dailyChallenges, userChallenges, optionsAssets, optionsChains, optionsApiLogs, swapTransactions, launchPools, launchTokenHoldings, launchTokenComments, launchTokenTrades } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods (legacy)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Account methods
  getAccounts(): Promise<Account[]>;
  getAccount(id: string): Promise<Account | undefined>;
  getAccountByAddress(address: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, updates: Partial<Account>): Promise<Account | undefined>;
  setActiveAccount(id: string): Promise<void>;
  getActiveAccount(): Promise<Account | undefined>;
  
  // Transaction methods
  getTransactions(accountId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Token methods
  getTokens(accountId: string): Promise<Token[]>;
  createToken(token: InsertToken): Promise<Token>;
  updateTokenBalance(accountId: string, contractAddress: string, balance: string): Promise<void>;
  
  // Lending methods
  getLendingPositions(userAddress: string): Promise<LendingPosition[]>;
  createLendingPosition(position: InsertLendingPosition): Promise<LendingPosition>;
  updateLendingPosition(userAddress: string, tokenAddress: string, positionType: string, amount: string, usdValue: string): Promise<void>;
  getLendingTransactions(userAddress: string): Promise<LendingTransaction[]>;
  createLendingTransaction(transaction: InsertLendingTransaction): Promise<LendingTransaction>;
  calculateTotalBorrowed(userAddress: string): Promise<number>;
  calculateTotalSupplied(userAddress: string): Promise<number>;
  
  // Reward system methods
  // Lessons
  getLessons(): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  
  // Daily tasks
  getDailyTasks(): Promise<DailyTask[]>;
  getDailyTask(id: string): Promise<DailyTask | undefined>;
  createDailyTask(task: InsertDailyTask): Promise<DailyTask>;
  
  // User progress
  getUserProgress(userAddress: string): Promise<UserProgress[]>;
  getUserLessonProgress(userAddress: string, lessonId: string): Promise<UserProgress | undefined>;
  createUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  updateUserProgress(id: string, updates: Partial<UserProgress>): Promise<UserProgress | undefined>;
  
  // User daily tasks
  getUserDailyTasks(userAddress: string, date: string): Promise<UserDailyTask[]>;
  getUserDailyTask(userAddress: string, taskId: string, date: string): Promise<UserDailyTask | undefined>;
  createUserDailyTask(task: InsertUserDailyTask): Promise<UserDailyTask>;
  updateUserDailyTask(id: string, updates: Partial<UserDailyTask>): Promise<UserDailyTask | undefined>;
  
  // Daily checkins
  getDailyCheckin(userAddress: string, date: string): Promise<DailyCheckin | undefined>;
  createDailyCheckin(checkin: InsertDailyCheckin): Promise<DailyCheckin>;
  getConsecutiveCheckins(userAddress: string): Promise<number>;
  
  // Reward transactions
  getRewardTransactions(userAddress: string): Promise<RewardTransaction[]>;
  createRewardTransaction(transaction: InsertRewardTransaction): Promise<RewardTransaction>;
  updateRewardTransaction(id: string, updates: Partial<RewardTransaction>): Promise<RewardTransaction | undefined>;
  getPendingRewardTransactions(): Promise<RewardTransaction[]>;
  
  // Server wallet
  getServerWallet(): Promise<ServerWallet | undefined>;
  createServerWallet(wallet: InsertServerWallet): Promise<ServerWallet>;
  updateServerWalletBalance(balance: string): Promise<void>;
  
  // Gamification methods
  // User stats
  getUserStats(userAddress: string): Promise<UserStats | undefined>;
  createUserStats(stats: InsertUserStats): Promise<UserStats>;
  updateUserStats(userAddress: string, updates: Partial<UserStats>): Promise<UserStats | undefined>;
  
  // Achievements
  getAchievements(): Promise<Achievement[]>;
  getAchievement(id: string): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  
  // User achievements
  getUserAchievements(userAddress: string): Promise<UserAchievement[]>;
  getUserAchievement(userAddress: string, achievementId: string): Promise<UserAchievement | undefined>;
  createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  
  // Daily challenges
  getDailyChallenges(): Promise<DailyChallenge[]>;
  getDailyChallenge(id: string): Promise<DailyChallenge | undefined>;
  createDailyChallenge(challenge: InsertDailyChallenge): Promise<DailyChallenge>;
  
  // User challenges
  getUserChallenges(userAddress: string, date: string): Promise<UserChallenge[]>;
  getUserChallenge(userAddress: string, challengeId: string, date: string): Promise<UserChallenge | undefined>;
  createUserChallenge(userChallenge: InsertUserChallenge): Promise<UserChallenge>;
  updateUserChallenge(id: string, updates: Partial<UserChallenge>): Promise<UserChallenge | undefined>;
  
  // Options trading methods
  getOptionsAssets(): Promise<OptionsAsset[]>;
  getOptionsAsset(tokenAddress: string): Promise<OptionsAsset | undefined>;
  createOptionsAsset(asset: InsertOptionsAsset): Promise<OptionsAsset>;
  updateOptionsAsset(id: string, updates: Partial<OptionsAsset>): Promise<OptionsAsset | undefined>;
  
  getOptionsChains(assetId: string): Promise<OptionsChain[]>;
  getOptionsChain(id: string): Promise<OptionsChain | undefined>;
  getOptionsChainByStrikeAndExpiry(assetId: string, strikePrice: string, expiry: Date): Promise<OptionsChain | undefined>;
  createOptionsChain(chain: InsertOptionsChain): Promise<OptionsChain>;
  updateOptionsChain(id: string, updates: Partial<OptionsChain>): Promise<OptionsChain | undefined>;
  upsertOptionsChain(chain: Omit<InsertOptionsChain, 'id'>): Promise<OptionsChain>;
  
  createOptionsApiLog(log: InsertOptionsApiLog): Promise<OptionsApiLog>;
  
  // Swap tracking methods
  getSwapTransactions(userAddress: string): Promise<SwapTransaction[]>;
  createSwapTransaction(swap: InsertSwapTransaction): Promise<SwapTransaction>;
  getSwapStats(userAddress: string): Promise<{totalVolume: number, totalSwaps: number, totalFees: number}>;
  getAllSwapStats(): Promise<{totalVolume: number, totalSwaps: number, totalFees: number}>;
  
  // PaxeerLaunch methods
  getLaunchPools(): Promise<LaunchPool[]>;
  getLaunchPool(poolAddress: string): Promise<LaunchPool | undefined>;
  createLaunchPool(pool: InsertLaunchPool): Promise<LaunchPool>;
  updateLaunchPool(id: string, updates: Partial<LaunchPool>): Promise<LaunchPool | undefined>;
  
  getLaunchTokenHoldings(userAddress: string): Promise<LaunchTokenHolding[]>;
  getLaunchTokenHolding(userAddress: string, poolId: string): Promise<LaunchTokenHolding | undefined>;
  createLaunchTokenHolding(holding: InsertLaunchTokenHolding): Promise<LaunchTokenHolding>;
  updateLaunchTokenHolding(id: string, updates: Partial<LaunchTokenHolding>): Promise<LaunchTokenHolding | undefined>;
  
  getLaunchTokenComments(poolId: string): Promise<LaunchTokenComment[]>;
  createLaunchTokenComment(comment: InsertLaunchTokenComment): Promise<LaunchTokenComment>;
  updateLaunchTokenComment(id: string, updates: Partial<LaunchTokenComment>): Promise<LaunchTokenComment | undefined>;
  
  getLaunchTokenTrades(poolId: string): Promise<LaunchTokenTrade[]>;
  createLaunchTokenTrade(trade: InsertLaunchTokenTrade): Promise<LaunchTokenTrade>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private accounts: Map<string, Account>;
  private transactions: Map<string, Transaction>;
  private tokens: Map<string, Token>;
  private lendingPositions: Map<string, LendingPosition>;
  private lendingTransactions: Map<string, LendingTransaction>;
  private activeAccountId: string | null = null;

  constructor() {
    this.users = new Map();
    this.accounts = new Map();
    this.transactions = new Map();
    this.tokens = new Map();
    this.lendingPositions = new Map();
    this.lendingTransactions = new Map();
  }

  // User methods (legacy)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Account methods
  async getAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async getAccount(id: string): Promise<Account | undefined> {
    return this.accounts.get(id);
  }

  async getAccountByAddress(address: string): Promise<Account | undefined> {
    return Array.from(this.accounts.values()).find(
      (account) => account.address.toLowerCase() === address.toLowerCase(),
    );
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const id = randomUUID();
    const account: Account = {
      ...insertAccount,
      id,
      isActive: insertAccount.isActive ?? false,
      createdAt: new Date(),
    };
    this.accounts.set(id, account);
    
    // Set as active if it's the first account
    if (this.accounts.size === 1) {
      this.activeAccountId = id;
      account.isActive = true;
    }
    
    return account;
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (!account) return undefined;
    
    const updatedAccount = { ...account, ...updates };
    this.accounts.set(id, updatedAccount);
    return updatedAccount;
  }

  async setActiveAccount(id: string): Promise<void> {
    // Deactivate all accounts
    for (const [accountId, account] of Array.from(this.accounts.entries())) {
      this.accounts.set(accountId, { ...account, isActive: false });
    }
    
    // Activate the specified account
    const account = this.accounts.get(id);
    if (account) {
      this.accounts.set(id, { ...account, isActive: true });
      this.activeAccountId = id;
    }
  }

  async getActiveAccount(): Promise<Account | undefined> {
    if (!this.activeAccountId) return undefined;
    return this.accounts.get(this.activeAccountId);
  }

  // Transaction methods
  async getTransactions(accountId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (tx) => tx.accountId === accountId,
    );
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      gasUsed: insertTransaction.gasUsed ?? null,
      blockNumber: insertTransaction.blockNumber ?? null,
      timestamp: new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  // Token methods
  async getTokens(accountId: string): Promise<Token[]> {
    return Array.from(this.tokens.values()).filter(
      (token) => token.accountId === accountId,
    );
  }

  async createToken(insertToken: InsertToken): Promise<Token> {
    const id = randomUUID();
    const token: Token = {
      ...insertToken,
      id,
      balance: insertToken.balance ?? "0",
      fiatValue: insertToken.fiatValue ?? "0",
    };
    this.tokens.set(id, token);
    return token;
  }

  async updateTokenBalance(accountId: string, contractAddress: string, balance: string): Promise<void> {
    const token = Array.from(this.tokens.values()).find(
      (t) => t.accountId === accountId && t.contractAddress.toLowerCase() === contractAddress.toLowerCase(),
    );
    
    if (token) {
      this.tokens.set(token.id, { ...token, balance });
    }
  }

  // Reward system stub methods (not used since we use DatabaseStorage)
  async getLessons(): Promise<Lesson[]> { return []; }
  async getLesson(id: string): Promise<Lesson | undefined> { return undefined; }
  async createLesson(lesson: InsertLesson): Promise<Lesson> { throw new Error("Not implemented"); }
  async getDailyTasks(): Promise<DailyTask[]> { return []; }
  async getDailyTask(id: string): Promise<DailyTask | undefined> { return undefined; }
  async createDailyTask(task: InsertDailyTask): Promise<DailyTask> { throw new Error("Not implemented"); }
  async getUserProgress(userAddress: string): Promise<UserProgress[]> { return []; }
  async getUserLessonProgress(userAddress: string, lessonId: string): Promise<UserProgress | undefined> { return undefined; }
  async createUserProgress(progress: InsertUserProgress): Promise<UserProgress> { throw new Error("Not implemented"); }
  async updateUserProgress(id: string, updates: Partial<UserProgress>): Promise<UserProgress | undefined> { return undefined; }
  async getUserDailyTasks(userAddress: string, date: string): Promise<UserDailyTask[]> { return []; }
  async getUserDailyTask(userAddress: string, taskId: string, date: string): Promise<UserDailyTask | undefined> { return undefined; }
  async createUserDailyTask(task: InsertUserDailyTask): Promise<UserDailyTask> { throw new Error("Not implemented"); }
  async updateUserDailyTask(id: string, updates: Partial<UserDailyTask>): Promise<UserDailyTask | undefined> { return undefined; }
  async getDailyCheckin(userAddress: string, date: string): Promise<DailyCheckin | undefined> { return undefined; }
  async createDailyCheckin(checkin: InsertDailyCheckin): Promise<DailyCheckin> { throw new Error("Not implemented"); }
  async getConsecutiveCheckins(userAddress: string): Promise<number> { return 0; }
  async getRewardTransactions(userAddress: string): Promise<RewardTransaction[]> { return []; }
  async createRewardTransaction(transaction: InsertRewardTransaction): Promise<RewardTransaction> { throw new Error("Not implemented"); }
  async updateRewardTransaction(id: string, updates: Partial<RewardTransaction>): Promise<RewardTransaction | undefined> { return undefined; }
  async getPendingRewardTransactions(): Promise<RewardTransaction[]> { return []; }
  async getServerWallet(): Promise<ServerWallet | undefined> { return undefined; }
  async createServerWallet(wallet: InsertServerWallet): Promise<ServerWallet> { throw new Error("Not implemented"); }
  async updateServerWalletBalance(balance: string): Promise<void> { }
  
  // Gamification stub methods
  async getUserStats(userAddress: string): Promise<UserStats | undefined> { return undefined; }
  async createUserStats(stats: InsertUserStats): Promise<UserStats> { throw new Error("Not implemented"); }
  async updateUserStats(userAddress: string, updates: Partial<UserStats>): Promise<UserStats | undefined> { return undefined; }
  async getAchievements(): Promise<Achievement[]> { return []; }
  async getAchievement(id: string): Promise<Achievement | undefined> { return undefined; }
  async createAchievement(achievement: InsertAchievement): Promise<Achievement> { throw new Error("Not implemented"); }
  async getUserAchievements(userAddress: string): Promise<UserAchievement[]> { return []; }
  async getUserAchievement(userAddress: string, achievementId: string): Promise<UserAchievement | undefined> { return undefined; }
  async createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement> { throw new Error("Not implemented"); }
  async getDailyChallenges(): Promise<DailyChallenge[]> { return []; }
  async getDailyChallenge(id: string): Promise<DailyChallenge | undefined> { return undefined; }
  async createDailyChallenge(challenge: InsertDailyChallenge): Promise<DailyChallenge> { throw new Error("Not implemented"); }
  async getUserChallenges(userAddress: string, date: string): Promise<UserChallenge[]> { return []; }
  async getUserChallenge(userAddress: string, challengeId: string, date: string): Promise<UserChallenge | undefined> { return undefined; }
  async createUserChallenge(userChallenge: InsertUserChallenge): Promise<UserChallenge> { throw new Error("Not implemented"); }
  async updateUserChallenge(id: string, updates: Partial<UserChallenge>): Promise<UserChallenge | undefined> { return undefined; }
  
  // Options trading stub methods
  async getOptionsAssets(): Promise<OptionsAsset[]> { return []; }
  async getOptionsAsset(tokenAddress: string): Promise<OptionsAsset | undefined> { return undefined; }
  async createOptionsAsset(asset: InsertOptionsAsset): Promise<OptionsAsset> { throw new Error("Not implemented"); }
  async updateOptionsAsset(id: string, updates: Partial<OptionsAsset>): Promise<OptionsAsset | undefined> { return undefined; }
  async getOptionsChains(assetId: string): Promise<OptionsChain[]> { return []; }
  async getOptionsChain(id: string): Promise<OptionsChain | undefined> { return undefined; }
  async getOptionsChainByStrikeAndExpiry(assetId: string, strikePrice: string, expiry: Date): Promise<OptionsChain | undefined> { return undefined; }
  async createOptionsChain(chain: InsertOptionsChain): Promise<OptionsChain> { throw new Error("Not implemented"); }
  async updateOptionsChain(id: string, updates: Partial<OptionsChain>): Promise<OptionsChain | undefined> { return undefined; }
  async upsertOptionsChain(chain: Omit<InsertOptionsChain, 'id'>): Promise<OptionsChain> { throw new Error("Not implemented"); }
  async createOptionsApiLog(log: InsertOptionsApiLog): Promise<OptionsApiLog> { throw new Error("Not implemented"); }

  // Lending methods
  async getLendingPositions(userAddress: string): Promise<LendingPosition[]> {
    return Array.from(this.lendingPositions.values()).filter(
      (position) => position.userAddress.toLowerCase() === userAddress.toLowerCase(),
    );
  }

  async createLendingPosition(insertPosition: InsertLendingPosition): Promise<LendingPosition> {
    const id = randomUUID();
    const position: LendingPosition = {
      ...insertPosition,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.lendingPositions.set(id, position);
    return position;
  }

  async updateLendingPosition(userAddress: string, tokenAddress: string, positionType: string, amount: string, usdValue: string): Promise<void> {
    const position = Array.from(this.lendingPositions.values()).find(
      (p) => 
        p.userAddress.toLowerCase() === userAddress.toLowerCase() && 
        p.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() &&
        p.positionType === positionType,
    );
    
    if (position) {
      this.lendingPositions.set(position.id, { 
        ...position, 
        amount, 
        usdValue,
        updatedAt: new Date()
      });
    }
  }

  async getLendingTransactions(userAddress: string): Promise<LendingTransaction[]> {
    return Array.from(this.lendingTransactions.values()).filter(
      (tx) => tx.userAddress.toLowerCase() === userAddress.toLowerCase(),
    );
  }

  async createLendingTransaction(insertTransaction: InsertLendingTransaction): Promise<LendingTransaction> {
    const id = randomUUID();
    const transaction: LendingTransaction = {
      ...insertTransaction,
      id,
      timestamp: new Date(),
    };
    this.lendingTransactions.set(id, transaction);
    return transaction;
  }

  async calculateTotalBorrowed(userAddress: string): Promise<number> {
    const positions = await this.getLendingPositions(userAddress);
    return positions
      .filter(p => p.positionType === 'borrow')
      .reduce((total, p) => total + parseFloat(p.usdValue), 0);
  }

  async calculateTotalSupplied(userAddress: string): Promise<number> {
    const positions = await this.getLendingPositions(userAddress);
    return positions
      .filter(p => p.positionType === 'deposit')
      .reduce((total, p) => total + parseFloat(p.usdValue), 0);
  }

  // Swap tracking stub methods
  async getSwapTransactions(userAddress: string): Promise<SwapTransaction[]> { return []; }
  async createSwapTransaction(swap: InsertSwapTransaction): Promise<SwapTransaction> { throw new Error("Not implemented"); }
  async getSwapStats(userAddress: string): Promise<{totalVolume: number, totalSwaps: number, totalFees: number}> { 
    return { totalVolume: 0, totalSwaps: 0, totalFees: 0 }; 
  }
  async getAllSwapStats(): Promise<{totalVolume: number, totalSwaps: number, totalFees: number}> { 
    return { totalVolume: 0, totalSwaps: 0, totalFees: 0 }; 
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User methods (legacy)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Account methods
  async getAccounts(): Promise<Account[]> {
    return await db.select().from(accounts);
  }

  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async getAccountByAddress(address: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.address, address));
    return account || undefined;
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db
      .insert(accounts)
      .values(insertAccount)
      .returning();
    return account;
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account | undefined> {
    const [account] = await db
      .update(accounts)
      .set(updates)
      .where(eq(accounts.id, id))
      .returning();
    return account || undefined;
  }

  async setActiveAccount(id: string): Promise<void> {
    // Deactivate all accounts
    await db.update(accounts).set({ isActive: false });
    
    // Activate the specified account
    await db.update(accounts).set({ isActive: true }).where(eq(accounts.id, id));
  }

  async getActiveAccount(): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.isActive, true));
    return account || undefined;
  }

  // Transaction methods
  async getTransactions(accountId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.accountId, accountId));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  // Token methods
  async getTokens(accountId: string): Promise<Token[]> {
    return await db.select().from(tokens).where(eq(tokens.accountId, accountId));
  }

  async createToken(insertToken: InsertToken): Promise<Token> {
    const [token] = await db
      .insert(tokens)
      .values(insertToken)
      .returning();
    return token;
  }

  async updateTokenBalance(accountId: string, contractAddress: string, balance: string): Promise<void> {
    await db
      .update(tokens)
      .set({ balance })
      .where(and(eq(tokens.accountId, accountId), eq(tokens.contractAddress, contractAddress)));
  }

  // Lending methods
  async getLendingPositions(userAddress: string): Promise<LendingPosition[]> {
    return await db.select().from(lendingPositions).where(eq(lendingPositions.userAddress, userAddress));
  }

  async createLendingPosition(insertPosition: InsertLendingPosition): Promise<LendingPosition> {
    const [position] = await db
      .insert(lendingPositions)
      .values(insertPosition)
      .returning();
    return position;
  }

  async updateLendingPosition(userAddress: string, tokenAddress: string, positionType: string, amount: string, usdValue: string): Promise<void> {
    await db
      .update(lendingPositions)
      .set({ 
        amount, 
        usdValue,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(lendingPositions.userAddress, userAddress),
          eq(lendingPositions.tokenAddress, tokenAddress),
          eq(lendingPositions.positionType, positionType)
        )
      );
  }

  async getLendingTransactions(userAddress: string): Promise<LendingTransaction[]> {
    return await db.select().from(lendingTransactions).where(eq(lendingTransactions.userAddress, userAddress));
  }

  async createLendingTransaction(insertTransaction: InsertLendingTransaction): Promise<LendingTransaction> {
    const [transaction] = await db
      .insert(lendingTransactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async calculateTotalBorrowed(userAddress: string): Promise<number> {
    const positions = await this.getLendingPositions(userAddress);
    return positions
      .filter(p => p.positionType === 'borrow')
      .reduce((total, p) => total + parseFloat(p.usdValue), 0);
  }

  async calculateTotalSupplied(userAddress: string): Promise<number> {
    const positions = await this.getLendingPositions(userAddress);
    return positions
      .filter(p => p.positionType === 'deposit')
      .reduce((total, p) => total + parseFloat(p.usdValue), 0);
  }

  // Reward system methods
  // Lessons
  async getLessons(): Promise<Lesson[]> {
    return await db.select().from(lessons).where(eq(lessons.isActive, true));
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson || undefined;
  }

  async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
    const [lesson] = await db
      .insert(lessons)
      .values(insertLesson)
      .returning();
    return lesson;
  }

  // Daily tasks
  async getDailyTasks(): Promise<DailyTask[]> {
    return await db.select().from(dailyTasks).where(eq(dailyTasks.isActive, true));
  }

  async getDailyTask(id: string): Promise<DailyTask | undefined> {
    const [task] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, id));
    return task || undefined;
  }

  async createDailyTask(insertTask: InsertDailyTask): Promise<DailyTask> {
    const [task] = await db
      .insert(dailyTasks)
      .values(insertTask)
      .returning();
    return task;
  }

  // User progress
  async getUserProgress(userAddress: string): Promise<UserProgress[]> {
    return await db.select().from(userProgress).where(eq(userProgress.userAddress, userAddress));
  }

  async getUserLessonProgress(userAddress: string, lessonId: string): Promise<UserProgress | undefined> {
    const [progress] = await db.select().from(userProgress).where(
      and(eq(userProgress.userAddress, userAddress), eq(userProgress.lessonId, lessonId))
    );
    return progress || undefined;
  }

  async createUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const [progress] = await db
      .insert(userProgress)
      .values(insertProgress)
      .returning();
    return progress;
  }

  async updateUserProgress(id: string, updates: Partial<UserProgress>): Promise<UserProgress | undefined> {
    const [progress] = await db
      .update(userProgress)
      .set(updates)
      .where(eq(userProgress.id, id))
      .returning();
    return progress || undefined;
  }

  // User daily tasks
  async getUserDailyTasks(userAddress: string, date: string): Promise<UserDailyTask[]> {
    return await db.select().from(userDailyTasks).where(
      and(eq(userDailyTasks.userAddress, userAddress), eq(userDailyTasks.date, date))
    );
  }

  async getUserDailyTask(userAddress: string, taskId: string, date: string): Promise<UserDailyTask | undefined> {
    const [task] = await db.select().from(userDailyTasks).where(
      and(
        eq(userDailyTasks.userAddress, userAddress),
        eq(userDailyTasks.taskId, taskId),
        eq(userDailyTasks.date, date)
      )
    );
    return task || undefined;
  }

  async createUserDailyTask(insertTask: InsertUserDailyTask): Promise<UserDailyTask> {
    const [task] = await db
      .insert(userDailyTasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateUserDailyTask(id: string, updates: Partial<UserDailyTask>): Promise<UserDailyTask | undefined> {
    const [task] = await db
      .update(userDailyTasks)
      .set(updates)
      .where(eq(userDailyTasks.id, id))
      .returning();
    return task || undefined;
  }

  // Daily checkins
  async getDailyCheckin(userAddress: string, date: string): Promise<DailyCheckin | undefined> {
    const [checkin] = await db.select().from(dailyCheckins).where(
      and(eq(dailyCheckins.userAddress, userAddress), eq(dailyCheckins.date, date))
    );
    return checkin || undefined;
  }

  async createDailyCheckin(insertCheckin: InsertDailyCheckin): Promise<DailyCheckin> {
    const [checkin] = await db
      .insert(dailyCheckins)
      .values(insertCheckin)
      .returning();
    return checkin;
  }

  async getConsecutiveCheckins(userAddress: string): Promise<number> {
    const checkins = await db.select().from(dailyCheckins)
      .where(eq(dailyCheckins.userAddress, userAddress))
      .orderBy(dailyCheckins.date);
    
    if (checkins.length === 0) return 0;
    
    let consecutive = 1;
    for (let i = checkins.length - 2; i >= 0; i--) {
      const currentDate = new Date(checkins[i + 1].date);
      const prevDate = new Date(checkins[i].date);
      const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        consecutive++;
      } else {
        break;
      }
    }
    
    return consecutive;
  }

  // Reward transactions
  async getRewardTransactions(userAddress: string): Promise<RewardTransaction[]> {
    return await db.select().from(rewardTransactions).where(eq(rewardTransactions.userAddress, userAddress));
  }

  async createRewardTransaction(insertTransaction: InsertRewardTransaction): Promise<RewardTransaction> {
    const [transaction] = await db
      .insert(rewardTransactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async updateRewardTransaction(id: string, updates: Partial<RewardTransaction>): Promise<RewardTransaction | undefined> {
    const [transaction] = await db
      .update(rewardTransactions)
      .set(updates)
      .where(eq(rewardTransactions.id, id))
      .returning();
    return transaction || undefined;
  }

  async getPendingRewardTransactions(): Promise<RewardTransaction[]> {
    return await db.select().from(rewardTransactions).where(eq(rewardTransactions.status, "pending"));
  }

  // Server wallet
  async getServerWallet(): Promise<ServerWallet | undefined> {
    const [wallet] = await db.select().from(serverWallet);
    return wallet || undefined;
  }

  async createServerWallet(insertWallet: InsertServerWallet): Promise<ServerWallet> {
    const [wallet] = await db
      .insert(serverWallet)
      .values(insertWallet)
      .returning();
    return wallet;
  }

  async updateServerWalletBalance(balance: string): Promise<void> {
    await db
      .update(serverWallet)
      .set({ balance, lastUpdated: new Date() });
  }

  // Options trading methods
  async getOptionsAssets(): Promise<OptionsAsset[]> {
    return await db.select().from(optionsAssets).where(eq(optionsAssets.isActive, true));
  }

  async getOptionsAsset(tokenAddress: string): Promise<OptionsAsset | undefined> {
    const [asset] = await db.select().from(optionsAssets).where(eq(optionsAssets.tokenAddress, tokenAddress));
    return asset || undefined;
  }

  async createOptionsAsset(insertAsset: InsertOptionsAsset): Promise<OptionsAsset> {
    const [asset] = await db
      .insert(optionsAssets)
      .values(insertAsset)
      .returning();
    return asset;
  }

  async updateOptionsAsset(id: string, updates: Partial<OptionsAsset>): Promise<OptionsAsset | undefined> {
    const [asset] = await db
      .update(optionsAssets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(optionsAssets.id, id))
      .returning();
    return asset || undefined;
  }

  async getOptionsChains(assetId: string): Promise<OptionsChain[]> {
    return await db.select().from(optionsChains)
      .where(and(eq(optionsChains.assetId, assetId), eq(optionsChains.isActive, true)));
  }

  async getOptionsChain(id: string): Promise<OptionsChain | undefined> {
    const [chain] = await db.select().from(optionsChains).where(eq(optionsChains.id, id));
    return chain || undefined;
  }

  async getOptionsChainByStrikeAndExpiry(assetId: string, strikePrice: string, expiry: Date): Promise<OptionsChain | undefined> {
    const [chain] = await db.select().from(optionsChains)
      .where(and(
        eq(optionsChains.assetId, assetId),
        eq(optionsChains.strikePrice, strikePrice),
        eq(optionsChains.expiry, expiry)
      ));
    return chain || undefined;
  }

  async createOptionsChain(insertChain: InsertOptionsChain): Promise<OptionsChain> {
    const [chain] = await db
      .insert(optionsChains)
      .values(insertChain)
      .returning();
    return chain;
  }

  async updateOptionsChain(id: string, updates: Partial<OptionsChain>): Promise<OptionsChain | undefined> {
    const [chain] = await db
      .update(optionsChains)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(optionsChains.id, id))
      .returning();
    return chain || undefined;
  }

  async upsertOptionsChain(chainData: Omit<InsertOptionsChain, 'id'>): Promise<OptionsChain> {
    // Try to find existing record
    const [existing] = await db.select().from(optionsChains)
      .where(
        and(
          eq(optionsChains.assetId, chainData.assetId),
          eq(optionsChains.strikePrice, chainData.strikePrice),
          eq(optionsChains.expiry, chainData.expiry)
        )
      );

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(optionsChains)
        .set({ 
          callPremium: chainData.callPremium,
          putPremium: chainData.putPremium,
          callIv: chainData.callIv,
          putIv: chainData.putIv,
          updatedAt: new Date()
        })
        .where(eq(optionsChains.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new record
      const [created] = await db
        .insert(optionsChains)
        .values(chainData)
        .returning();
      return created;
    }
  }

  async createOptionsApiLog(insertLog: InsertOptionsApiLog): Promise<OptionsApiLog> {
    const [log] = await db
      .insert(optionsApiLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  // Swap tracking methods
  async getSwapTransactions(userAddress: string): Promise<SwapTransaction[]> {
    return await db
      .select()
      .from(swapTransactions)
      .where(eq(swapTransactions.userAddress, userAddress))
      .orderBy(swapTransactions.timestamp);
  }

  async createSwapTransaction(insertSwap: InsertSwapTransaction): Promise<SwapTransaction> {
    const [swap] = await db
      .insert(swapTransactions)
      .values(insertSwap)
      .returning();
    return swap;
  }

  async getSwapStats(userAddress: string): Promise<{totalVolume: number, totalSwaps: number, totalFees: number}> {
    const userSwaps = await this.getSwapTransactions(userAddress);
    
    const totalVolume = userSwaps.reduce((sum, swap) => sum + parseFloat(swap.usdValueIn), 0);
    const totalSwaps = userSwaps.length;
    const totalFees = userSwaps.reduce((sum, swap) => sum + parseFloat(swap.feeUsd), 0);
    
    return { totalVolume, totalSwaps, totalFees };
  }

  async getAllSwapStats(): Promise<{totalVolume: number, totalSwaps: number, totalFees: number}> {
    const allSwaps = await db.select().from(swapTransactions);
    
    const totalVolume = allSwaps.reduce((sum, swap) => sum + parseFloat(swap.usdValueIn), 0);
    const totalSwaps = allSwaps.length;
    const totalFees = allSwaps.reduce((sum, swap) => sum + parseFloat(swap.feeUsd), 0);
    
    return { totalVolume, totalSwaps, totalFees };
  }

  // PaxeerLaunch methods
  async getLaunchPools(): Promise<LaunchPool[]> {
    return await db
      .select()
      .from(launchPools)
      .where(eq(launchPools.isActive, true))
      .orderBy(launchPools.createdAt);
  }

  async getLaunchPool(poolAddress: string): Promise<LaunchPool | undefined> {
    const [pool] = await db
      .select()
      .from(launchPools)
      .where(eq(launchPools.poolAddress, poolAddress));
    return pool;
  }

  async createLaunchPool(insertPool: InsertLaunchPool): Promise<LaunchPool> {
    const [pool] = await db
      .insert(launchPools)
      .values(insertPool)
      .returning();
    return pool;
  }

  async updateLaunchPool(id: string, updates: Partial<LaunchPool>): Promise<LaunchPool | undefined> {
    const [pool] = await db
      .update(launchPools)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(launchPools.id, id))
      .returning();
    return pool;
  }

  async getLaunchTokenHoldings(userAddress: string): Promise<LaunchTokenHolding[]> {
    return await db
      .select()
      .from(launchTokenHoldings)
      .where(eq(launchTokenHoldings.userAddress, userAddress))
      .orderBy(launchTokenHoldings.createdAt);
  }

  async getLaunchTokenHolding(userAddress: string, poolId: string): Promise<LaunchTokenHolding | undefined> {
    const [holding] = await db
      .select()
      .from(launchTokenHoldings)
      .where(and(
        eq(launchTokenHoldings.userAddress, userAddress),
        eq(launchTokenHoldings.poolId, poolId)
      ));
    return holding;
  }

  async createLaunchTokenHolding(insertHolding: InsertLaunchTokenHolding): Promise<LaunchTokenHolding> {
    const [holding] = await db
      .insert(launchTokenHoldings)
      .values(insertHolding)
      .returning();
    return holding;
  }

  async updateLaunchTokenHolding(id: string, updates: Partial<LaunchTokenHolding>): Promise<LaunchTokenHolding | undefined> {
    const [holding] = await db
      .update(launchTokenHoldings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(launchTokenHoldings.id, id))
      .returning();
    return holding;
  }

  async getLaunchTokenComments(poolId: string): Promise<LaunchTokenComment[]> {
    return await db
      .select()
      .from(launchTokenComments)
      .where(eq(launchTokenComments.poolId, poolId))
      .orderBy(launchTokenComments.createdAt);
  }

  async createLaunchTokenComment(insertComment: InsertLaunchTokenComment): Promise<LaunchTokenComment> {
    const [comment] = await db
      .insert(launchTokenComments)
      .values(insertComment)
      .returning();
    return comment;
  }

  async updateLaunchTokenComment(id: string, updates: Partial<LaunchTokenComment>): Promise<LaunchTokenComment | undefined> {
    const [comment] = await db
      .update(launchTokenComments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(launchTokenComments.id, id))
      .returning();
    return comment;
  }

  async getLaunchTokenTrades(poolId: string): Promise<LaunchTokenTrade[]> {
    return await db
      .select()
      .from(launchTokenTrades)
      .where(eq(launchTokenTrades.poolId, poolId))
      .orderBy(launchTokenTrades.timestamp);
  }

  async createLaunchTokenTrade(insertTrade: InsertLaunchTokenTrade): Promise<LaunchTokenTrade> {
    const [trade] = await db
      .insert(launchTokenTrades)
      .values(insertTrade)
      .returning();
    return trade;
  }

  async clearAllLessons(): Promise<void> {
    await db.delete(lessons);
  }
  
  // Gamification methods
  // User stats
  async getUserStats(userAddress: string): Promise<UserStats | undefined> {
    const [stats] = await db.select().from(userStats).where(eq(userStats.userAddress, userAddress));
    return stats || undefined;
  }
  
  async createUserStats(insertStats: InsertUserStats): Promise<UserStats> {
    const [stats] = await db
      .insert(userStats)
      .values(insertStats)
      .returning();
    return stats;
  }
  
  async updateUserStats(userAddress: string, updates: Partial<UserStats>): Promise<UserStats | undefined> {
    const [stats] = await db
      .update(userStats)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userStats.userAddress, userAddress))
      .returning();
    return stats || undefined;
  }
  
  // Achievements
  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements).where(eq(achievements.isActive, true));
  }
  
  async getAchievement(id: string): Promise<Achievement | undefined> {
    const [achievement] = await db.select().from(achievements).where(eq(achievements.id, id));
    return achievement || undefined;
  }
  
  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const [achievement] = await db
      .insert(achievements)
      .values(insertAchievement)
      .returning();
    return achievement;
  }
  
  // User achievements
  async getUserAchievements(userAddress: string): Promise<UserAchievement[]> {
    return await db.select().from(userAchievements).where(eq(userAchievements.userAddress, userAddress));
  }
  
  async getUserAchievement(userAddress: string, achievementId: string): Promise<UserAchievement | undefined> {
    const [userAchievement] = await db.select().from(userAchievements).where(
      and(eq(userAchievements.userAddress, userAddress), eq(userAchievements.achievementId, achievementId))
    );
    return userAchievement || undefined;
  }
  
  async createUserAchievement(insertUserAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const [userAchievement] = await db
      .insert(userAchievements)
      .values(insertUserAchievement)
      .returning();
    return userAchievement;
  }
  
  // Daily challenges
  async getDailyChallenges(): Promise<DailyChallenge[]> {
    return await db.select().from(dailyChallenges).where(eq(dailyChallenges.isActive, true));
  }
  
  async getDailyChallenge(id: string): Promise<DailyChallenge | undefined> {
    const [challenge] = await db.select().from(dailyChallenges).where(eq(dailyChallenges.id, id));
    return challenge || undefined;
  }
  
  async createDailyChallenge(insertChallenge: InsertDailyChallenge): Promise<DailyChallenge> {
    const [challenge] = await db
      .insert(dailyChallenges)
      .values(insertChallenge)
      .returning();
    return challenge;
  }
  
  // User challenges
  async getUserChallenges(userAddress: string, date: string): Promise<UserChallenge[]> {
    return await db.select().from(userChallenges).where(
      and(eq(userChallenges.userAddress, userAddress), eq(userChallenges.date, date))
    );
  }
  
  async getUserChallenge(userAddress: string, challengeId: string, date: string): Promise<UserChallenge | undefined> {
    const [userChallenge] = await db.select().from(userChallenges).where(
      and(
        eq(userChallenges.userAddress, userAddress),
        eq(userChallenges.challengeId, challengeId),
        eq(userChallenges.date, date)
      )
    );
    return userChallenge || undefined;
  }
  
  async createUserChallenge(insertUserChallenge: InsertUserChallenge): Promise<UserChallenge> {
    const [userChallenge] = await db
      .insert(userChallenges)
      .values(insertUserChallenge)
      .returning();
    return userChallenge;
  }
  
  async updateUserChallenge(id: string, updates: Partial<UserChallenge>): Promise<UserChallenge | undefined> {
    const [userChallenge] = await db
      .update(userChallenges)
      .set(updates)
      .where(eq(userChallenges.id, id))
      .returning();
    return userChallenge || undefined;
  }
}

export const storage = new DatabaseStorage();
