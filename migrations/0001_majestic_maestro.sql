CREATE TABLE "achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"requirement" text NOT NULL,
	"reward_xp" text DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"challenge_type" text NOT NULL,
	"reward_amount" numeric(28, 18) NOT NULL,
	"xp_reward" text NOT NULL,
	"target" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"achievement_id" varchar NOT NULL,
	"unlocked_at" timestamp DEFAULT now(),
	"xp_awarded" text DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "user_challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"challenge_id" varchar NOT NULL,
	"date" text NOT NULL,
	"progress" text DEFAULT '0',
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"reward_claimed" boolean DEFAULT false,
	"claimed_at" timestamp,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"level" text DEFAULT '1',
	"xp" text DEFAULT '0',
	"total_earned" numeric(28, 18) DEFAULT '0',
	"streak" text DEFAULT '0',
	"lessons_completed" text DEFAULT '0',
	"last_check_in" timestamp,
	"last_activity" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_stats_user_address_unique" UNIQUE("user_address")
);
