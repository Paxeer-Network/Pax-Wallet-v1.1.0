import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull().unique(),
  privateKey: text("private_key").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  hash: text("hash").notNull(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  value: decimal("value", { precision: 36, scale: 18 }).notNull(),
  gasUsed: text("gas_used"),
  blockNumber: text("block_number"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const tokens = pgTable("tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  contractAddress: text("contract_address").notNull(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  decimals: text("decimals").notNull(),
  balance: decimal("balance", { precision: 36, scale: 18 }).default("0"),
  fiatValue: decimal("fiat_value", { precision: 18, scale: 2 }).default("0"),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  timestamp: true,
});

export const insertTokenSchema = createInsertSchema(tokens).omit({
  id: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = typeof tokens.$inferSelect;

// API response types for multi-source blockchain data
export interface BlockchainBalance {
  address: string;
  balance: string;
  source: 'rpc' | 'blockscout' | 'wallet-api';
}

export interface BlockchainToken {
  balance: string;
  token_id?: string;
  details: {
    name: string;
    symbol: string;
    decimals: string;
    type: string;
    contract?: string;
    address_hash?: string;
    fiat_value?: string;
    exchange_rate?: string;
    icon_url?: string;
  };
}

export interface BlockchainTransaction {
  hash: string;
  from_address_hash?: string;
  to_address_hash?: string;
  from?: { hash: string };
  to?: { hash: string };
  value: string;
  gas_used?: string;
  block_number: string;
  timestamp?: string;
  status?: string;
  method?: string;
  fee?: any;
}

export interface BlockchainTokenTransfer {
  transaction_hash: string;
  from_address_hash?: string;
  to_address_hash?: string;
  from?: { hash: string };
  to?: { hash: string };
  amount?: string;
  total?: { value: string; decimals?: string };
  block_number: string;
  timestamp?: string;
  method?: string;
  token: {
    name: string;
    symbol: string;
    type: string;
    contract?: string;
    address_hash?: string;
    decimals: string;
  };
}

// New consolidated profile response type matching lending-api.paxeer.app/api/v1/profile/{address}
export interface AddressProfile {
  address: string;
  balances: {
    native: string;
    tokens: {
      contract_address: string;
      name: string;
      symbol: string;
      decimals: number;
      balance: string;
      raw_balance: string;
      type: string;
      price_usd: string;
      value_usd: string;
      icon_url?: string; // Optional icon URL
    }[];
  };
  transactions: {
    hash: string;
    from: string;
    to: string;
    value: string;
    timestamp: string;
    block_number: number;
    gas_fee: string;
    status: string;
    type: string;
  }[];
}

// Transaction detail response from paxscan
export interface TransactionDetail {
  hash: string;
  value: string;
  from: {
    hash: string;
    name?: string;
    is_contract: boolean;
    is_verified: boolean;
  };
  to: {
    hash: string;
    name?: string;
    is_contract: boolean;
    is_verified: boolean;
  };
  gas_used: string;
  gas_limit: string;
  gas_price: string;
  base_fee_per_gas?: string;
  fee: {
    type: string;
    value: string;
  };
  status: string;
  result: string;
  timestamp: string;
  block_number: number;
  nonce: number;
  type: number;
  method?: string;
  position: number;
  confirmations: number;
  exchange_rate?: string;
  token_transfers: any[];
  transaction_types: string[];
}

// Legacy user schema for compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Lending activity tracking tables
export const lendingPositions = pgTable("lending_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  tokenAddress: text("token_address").notNull(),
  positionType: text("position_type").notNull(), // 'deposit', 'borrow'
  amount: decimal("amount", { precision: 36, scale: 18 }).notNull(),
  usdValue: decimal("usd_value", { precision: 18, scale: 2 }).notNull(),
  tokenPrice: decimal("token_price", { precision: 18, scale: 6 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const lendingTransactions = pgTable("lending_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull(),
  transactionHash: text("transaction_hash").notNull().unique(),
  action: text("action").notNull(), // 'deposit', 'withdraw', 'borrow', 'repay'
  tokenSymbol: text("token_symbol").notNull(),
  tokenAddress: text("token_address").notNull(),
  amount: decimal("amount", { precision: 36, scale: 18 }).notNull(),
  usdValue: decimal("usd_value", { precision: 18, scale: 2 }).notNull(),
  tokenPrice: decimal("token_price", { precision: 18, scale: 6 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertLendingPositionSchema = createInsertSchema(lendingPositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLendingTransactionSchema = createInsertSchema(lendingTransactions).omit({
  id: true,
  timestamp: true,
});

export type InsertLendingPosition = z.infer<typeof insertLendingPositionSchema>;
export type LendingPosition = typeof lendingPositions.$inferSelect;
export type InsertLendingTransaction = z.infer<typeof insertLendingTransactionSchema>;
export type LendingTransaction = typeof lendingTransactions.$inferSelect;

// Reward system tables
export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(), // JSON string containing lesson content
  difficulty: text("difficulty").notNull(), // 'beginner', 'intermediate', 'advanced'
  rewardAmount: decimal("reward_amount", { precision: 28, scale: 18 }).notNull(),
  estimatedTime: text("estimated_time").notNull(), // e.g., "5 minutes"
  category: text("category").notNull(), // 'defi', 'trading', 'security', etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dailyTasks = pgTable("daily_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  taskType: text("task_type").notNull(), // 'transaction', 'login', 'lesson', 'swap', 'lend'
  rewardAmount: decimal("reward_amount", { precision: 28, scale: 18 }).notNull(),
  targetValue: text("target_value"), // For tasks like "make 3 transactions"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull(),
  lessonId: varchar("lesson_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  rewardClaimed: boolean("reward_claimed").default(false),
  claimedAt: timestamp("claimed_at"),
});

export const userDailyTasks = pgTable("user_daily_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull(),
  taskId: varchar("task_id").notNull(),
  date: text("date").notNull(), // Format: YYYY-MM-DD
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  rewardClaimed: boolean("reward_claimed").default(false),
  claimedAt: timestamp("claimed_at"),
  progress: text("progress").default("0"), // For tracking progress towards target
});

export const dailyCheckins = pgTable("daily_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull(),
  date: text("date").notNull(), // Format: YYYY-MM-DD
  checkedInAt: timestamp("checked_in_at").defaultNow(),
  rewardAmount: decimal("reward_amount", { precision: 28, scale: 18 }).notNull(),
  consecutiveDays: text("consecutive_days").default("1"),
});

export const rewardTransactions = pgTable("reward_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull(),
  rewardType: text("reward_type").notNull(), // 'lesson', 'daily_task', 'checkin'
  rewardId: varchar("reward_id"), // ID of the lesson, task, or checkin
  amount: decimal("amount", { precision: 28, scale: 18 }).notNull(),
  transactionHash: text("transaction_hash"),
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
});

export const serverWallet = pgTable("server_wallet", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull(),
  privateKey: text("private_key").notNull(),
  balance: decimal("balance", { precision: 28, scale: 18 }).default("0"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Schemas for inserts
export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyTaskSchema = createInsertSchema(dailyTasks).omit({
  id: true,
  createdAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  completedAt: true,
});

export const insertUserDailyTaskSchema = createInsertSchema(userDailyTasks).omit({
  id: true,
});

export const insertDailyCheckinSchema = createInsertSchema(dailyCheckins).omit({
  id: true,
  checkedInAt: true,
});

export const insertRewardTransactionSchema = createInsertSchema(rewardTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertServerWalletSchema = createInsertSchema(serverWallet).omit({
  id: true,
  lastUpdated: true,
});

// Types
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertDailyTask = z.infer<typeof insertDailyTaskSchema>;
export type DailyTask = typeof dailyTasks.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserDailyTask = z.infer<typeof insertUserDailyTaskSchema>;
export type UserDailyTask = typeof userDailyTasks.$inferSelect;
export type InsertDailyCheckin = z.infer<typeof insertDailyCheckinSchema>;
export type DailyCheckin = typeof dailyCheckins.$inferSelect;
export type InsertRewardTransaction = z.infer<typeof insertRewardTransactionSchema>;
export type RewardTransaction = typeof rewardTransactions.$inferSelect;
export type InsertServerWallet = z.infer<typeof insertServerWalletSchema>;
export type ServerWallet = typeof serverWallet.$inferSelect;

// Gamification tables
export const userStats = pgTable("user_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull().unique(),
  level: text("level").default("1"),
  xp: text("xp").default("0"),
  totalEarned: decimal("total_earned", { precision: 28, scale: 18 }).default("0"),
  streak: text("streak").default("0"),
  lessonsCompleted: text("lessons_completed").default("0"),
  lastCheckIn: timestamp("last_check_in"),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  requirement: text("requirement").notNull(), // JSON string with requirement details
  rewardXp: text("reward_xp").default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull(),
  achievementId: varchar("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  xpAwarded: text("xp_awarded").default("0"),
});

export const dailyChallenges = pgTable("daily_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  challengeType: text("challenge_type").notNull(), // 'swap', 'lesson', 'portfolio_view', etc.
  rewardAmount: decimal("reward_amount", { precision: 28, scale: 18 }).notNull(),
  xpReward: text("xp_reward").notNull(),
  target: text("target").notNull(), // Target number to complete
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userChallenges = pgTable("user_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull(),
  challengeId: varchar("challenge_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  progress: text("progress").default("0"),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  rewardClaimed: boolean("reward_claimed").default(false),
  claimedAt: timestamp("claimed_at"),
  expiresAt: timestamp("expires_at").notNull(),
});

// Schemas for inserts
export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  unlockedAt: true,
});

export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges).omit({
  id: true,
  createdAt: true,
});

export const insertUserChallengeSchema = createInsertSchema(userChallenges).omit({
  id: true,
});

// Types
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertDailyChallenge = z.infer<typeof insertDailyChallengeSchema>;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type InsertUserChallenge = z.infer<typeof insertUserChallengeSchema>;
export type UserChallenge = typeof userChallenges.$inferSelect;

// Options trading tables
export const optionsAssets = pgTable("options_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenAddress: text("token_address").notNull().unique(),
  tokenSymbol: text("token_symbol").notNull(),
  tokenName: text("token_name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const optionsChains = pgTable("options_chains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull(),
  strikePrice: decimal("strike_price", { precision: 18, scale: 8 }).notNull(),
  expiry: timestamp("expiry").notNull(),
  callPremium: decimal("call_premium", { precision: 18, scale: 6 }).notNull(),
  putPremium: decimal("put_premium", { precision: 18, scale: 6 }).notNull(),
  callIv: decimal("call_iv", { precision: 8, scale: 2 }).notNull(),
  putIv: decimal("put_iv", { precision: 8, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const optionsApiLogs = pgTable("options_api_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endpoint: text("endpoint").notNull(),
  requestData: text("request_data"), // JSON string
  responseData: text("response_data"), // JSON string
  status: text("status").notNull(), // 'success', 'error'
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Schemas for inserts
export const insertOptionsAssetSchema = createInsertSchema(optionsAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOptionsChainSchema = createInsertSchema(optionsChains).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOptionsApiLogSchema = createInsertSchema(optionsApiLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertOptionsAsset = z.infer<typeof insertOptionsAssetSchema>;
export type OptionsAsset = typeof optionsAssets.$inferSelect;
export type InsertOptionsChain = z.infer<typeof insertOptionsChainSchema>;
export type OptionsChain = typeof optionsChains.$inferSelect;
export type InsertOptionsApiLog = z.infer<typeof insertOptionsApiLogSchema>;
export type OptionsApiLog = typeof optionsApiLogs.$inferSelect;

// Swap tracking schema
export const swapTransactions = pgTable("swap_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull(),
  transactionHash: text("transaction_hash").notNull().unique(),
  tokenInAddress: text("token_in_address").notNull(),
  tokenInSymbol: text("token_in_symbol").notNull(),
  tokenOutAddress: text("token_out_address").notNull(),
  tokenOutSymbol: text("token_out_symbol").notNull(),
  amountIn: decimal("amount_in", { precision: 36, scale: 18 }).notNull(),
  amountOut: decimal("amount_out", { precision: 36, scale: 18 }).notNull(),
  usdValueIn: decimal("usd_value_in", { precision: 18, scale: 2 }).notNull(),
  usdValueOut: decimal("usd_value_out", { precision: 18, scale: 2 }).notNull(),
  feeAmount: decimal("fee_amount", { precision: 36, scale: 18 }).notNull(),
  feeUsd: decimal("fee_usd", { precision: 18, scale: 2 }).notNull(),
  gasUsed: text("gas_used"),
  gasPrice: text("gas_price"),
  blockNumber: text("block_number"),
  timestamp: text("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSwapTransactionSchema = createInsertSchema(swapTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertSwapTransaction = z.infer<typeof insertSwapTransactionSchema>;
export type SwapTransaction = typeof swapTransactions.$inferSelect;

// PaxeerLaunch token launchpad tables
export const launchPools = pgTable("launch_pools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolAddress: text("pool_address").notNull().unique(),
  projectToken: text("project_token").notNull(),
  tokenName: text("token_name").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  imageUrl: text("image_url"),
  xUrl: text("x_url"),
  telegramUrl: text("telegram_url"),
  websiteUrl: text("website_url"),
  creatorAddress: text("creator_address").notNull(),
  currentPrice: decimal("current_price", { precision: 36, scale: 18 }).default("0"),
  marketCap: decimal("market_cap", { precision: 36, scale: 18 }).default("0"),
  totalVolumeUsdc: decimal("total_volume_usdc", { precision: 36, scale: 18 }).default("0"),
  totalTrades: text("total_trades").default("0"),
  priceChange24h: decimal("price_change_24h", { precision: 18, scale: 8 }).default("0"),
  athPrice: decimal("ath_price", { precision: 36, scale: 18 }).default("0"),
  atlPrice: decimal("atl_price", { precision: 36, scale: 18 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const launchTokenHoldings = pgTable("launch_token_holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull(),
  poolId: varchar("pool_id").notNull(),
  tokenAddress: text("token_address").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  balance: decimal("balance", { precision: 36, scale: 18 }).notNull(),
  usdValue: decimal("usd_value", { precision: 18, scale: 2 }).notNull(),
  averageBuyPrice: decimal("average_buy_price", { precision: 36, scale: 18 }).notNull(),
  totalInvested: decimal("total_invested", { precision: 18, scale: 2 }).notNull(),
  pnl: decimal("pnl", { precision: 18, scale: 2 }).default("0"),
  pnlPercent: decimal("pnl_percent", { precision: 8, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const launchTokenComments = pgTable("launch_token_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").notNull(),
  userAddress: text("user_address").notNull(),
  content: text("content").notNull(),
  isEdited: boolean("is_edited").default(false),
  likes: text("likes").default("0"),
  dislikes: text("dislikes").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const launchTokenTrades = pgTable("launch_token_trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").notNull(),
  userAddress: text("user_address").notNull(),
  transactionHash: text("transaction_hash").notNull().unique(),
  tradeType: text("trade_type").notNull(), // 'buy' or 'sell'
  usdcAmount: decimal("usdc_amount", { precision: 36, scale: 18 }).notNull(),
  tokenAmount: decimal("token_amount", { precision: 36, scale: 18 }).notNull(),
  price: decimal("price", { precision: 36, scale: 18 }).notNull(),
  blockNumber: text("block_number"),
  timestamp: text("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas for inserts
export const insertLaunchPoolSchema = createInsertSchema(launchPools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLaunchTokenHoldingSchema = createInsertSchema(launchTokenHoldings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLaunchTokenCommentSchema = createInsertSchema(launchTokenComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLaunchTokenTradeSchema = createInsertSchema(launchTokenTrades).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertLaunchPool = z.infer<typeof insertLaunchPoolSchema>;
export type LaunchPool = typeof launchPools.$inferSelect;
export type InsertLaunchTokenHolding = z.infer<typeof insertLaunchTokenHoldingSchema>;
export type LaunchTokenHolding = typeof launchTokenHoldings.$inferSelect;
export type InsertLaunchTokenComment = z.infer<typeof insertLaunchTokenCommentSchema>;
export type LaunchTokenComment = typeof launchTokenComments.$inferSelect;
export type InsertLaunchTokenTrade = z.infer<typeof insertLaunchTokenTradeSchema>;
export type LaunchTokenTrade = typeof launchTokenTrades.$inferSelect;
