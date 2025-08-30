CREATE TABLE "accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"private_key" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "accounts_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "daily_checkins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"date" text NOT NULL,
	"checked_in_at" timestamp DEFAULT now(),
	"reward_amount" numeric(28, 18) NOT NULL,
	"consecutive_days" text DEFAULT '1'
);
--> statement-breakpoint
CREATE TABLE "daily_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"task_type" text NOT NULL,
	"reward_amount" numeric(28, 18) NOT NULL,
	"target_value" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "launch_pools" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_address" text NOT NULL,
	"project_token" text NOT NULL,
	"token_name" text NOT NULL,
	"token_symbol" text NOT NULL,
	"image_url" text,
	"x_url" text,
	"telegram_url" text,
	"website_url" text,
	"creator_address" text NOT NULL,
	"current_price" numeric(36, 18) DEFAULT '0',
	"market_cap" numeric(36, 18) DEFAULT '0',
	"total_volume_usdc" numeric(36, 18) DEFAULT '0',
	"total_trades" text DEFAULT '0',
	"price_change_24h" numeric(18, 8) DEFAULT '0',
	"ath_price" numeric(36, 18) DEFAULT '0',
	"atl_price" numeric(36, 18) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "launch_pools_pool_address_unique" UNIQUE("pool_address")
);
--> statement-breakpoint
CREATE TABLE "launch_token_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" varchar NOT NULL,
	"user_address" text NOT NULL,
	"content" text NOT NULL,
	"is_edited" boolean DEFAULT false,
	"likes" text DEFAULT '0',
	"dislikes" text DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "launch_token_holdings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"pool_id" varchar NOT NULL,
	"token_address" text NOT NULL,
	"token_symbol" text NOT NULL,
	"balance" numeric(36, 18) NOT NULL,
	"usd_value" numeric(18, 2) NOT NULL,
	"average_buy_price" numeric(36, 18) NOT NULL,
	"total_invested" numeric(18, 2) NOT NULL,
	"pnl" numeric(18, 2) DEFAULT '0',
	"pnl_percent" numeric(8, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "launch_token_trades" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" varchar NOT NULL,
	"user_address" text NOT NULL,
	"transaction_hash" text NOT NULL,
	"trade_type" text NOT NULL,
	"usdc_amount" numeric(36, 18) NOT NULL,
	"token_amount" numeric(36, 18) NOT NULL,
	"price" numeric(36, 18) NOT NULL,
	"block_number" text,
	"timestamp" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "launch_token_trades_transaction_hash_unique" UNIQUE("transaction_hash")
);
--> statement-breakpoint
CREATE TABLE "lending_positions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"token_symbol" text NOT NULL,
	"token_address" text NOT NULL,
	"position_type" text NOT NULL,
	"amount" numeric(36, 18) NOT NULL,
	"usd_value" numeric(18, 2) NOT NULL,
	"token_price" numeric(18, 6) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lending_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"transaction_hash" text NOT NULL,
	"action" text NOT NULL,
	"token_symbol" text NOT NULL,
	"token_address" text NOT NULL,
	"amount" numeric(36, 18) NOT NULL,
	"usd_value" numeric(18, 2) NOT NULL,
	"token_price" numeric(18, 6) NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	CONSTRAINT "lending_transactions_transaction_hash_unique" UNIQUE("transaction_hash")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"content" text NOT NULL,
	"difficulty" text NOT NULL,
	"reward_amount" numeric(28, 18) NOT NULL,
	"estimated_time" text NOT NULL,
	"category" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "options_api_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"request_data" text,
	"response_data" text,
	"status" text NOT NULL,
	"error_message" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "options_assets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_address" text NOT NULL,
	"token_symbol" text NOT NULL,
	"token_name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "options_assets_token_address_unique" UNIQUE("token_address")
);
--> statement-breakpoint
CREATE TABLE "options_chains" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" varchar NOT NULL,
	"strike_price" numeric(18, 8) NOT NULL,
	"expiry" timestamp NOT NULL,
	"call_premium" numeric(18, 6) NOT NULL,
	"put_premium" numeric(18, 6) NOT NULL,
	"call_iv" numeric(8, 2) NOT NULL,
	"put_iv" numeric(8, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reward_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"reward_type" text NOT NULL,
	"reward_id" varchar,
	"amount" numeric(28, 18) NOT NULL,
	"transaction_hash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "server_wallet" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"private_key" text NOT NULL,
	"balance" numeric(28, 18) DEFAULT '0',
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "swap_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"transaction_hash" text NOT NULL,
	"token_in_address" text NOT NULL,
	"token_in_symbol" text NOT NULL,
	"token_out_address" text NOT NULL,
	"token_out_symbol" text NOT NULL,
	"amount_in" numeric(36, 18) NOT NULL,
	"amount_out" numeric(36, 18) NOT NULL,
	"usd_value_in" numeric(18, 2) NOT NULL,
	"usd_value_out" numeric(18, 2) NOT NULL,
	"fee_amount" numeric(36, 18) NOT NULL,
	"fee_usd" numeric(18, 2) NOT NULL,
	"gas_used" text,
	"gas_price" text,
	"block_number" text,
	"timestamp" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "swap_transactions_transaction_hash_unique" UNIQUE("transaction_hash")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"contract_address" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"decimals" text NOT NULL,
	"balance" numeric(36, 18) DEFAULT '0',
	"fiat_value" numeric(18, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"hash" text NOT NULL,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"value" numeric(36, 18) NOT NULL,
	"gas_used" text,
	"block_number" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_daily_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"task_id" varchar NOT NULL,
	"date" text NOT NULL,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"reward_claimed" boolean DEFAULT false,
	"claimed_at" timestamp,
	"progress" text DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"lesson_id" varchar NOT NULL,
	"completed_at" timestamp DEFAULT now(),
	"reward_claimed" boolean DEFAULT false,
	"claimed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
