import { storage } from './storage';
import { sampleLessons } from '../client/src/data/sampleLessons';
import { achievements as achievementsTable, dailyChallenges as dailyChallengesTable } from '@shared/schema';
import { db } from './db';

// Achievement definitions
const achievementsData = [
  {
    id: 'first_lesson',
    title: 'First Steps',
    description: 'Complete your first lesson',
    icon: '🎓',
    xpReward: 50,
    paxReward: '5',
    requirement: { type: 'lessons_completed', value: 1 },
    isActive: true
  },
  {
    id: 'lesson_master',
    title: 'Lesson Master',
    description: 'Complete 10 lessons',
    icon: '📚',
    xpReward: 200,
    paxReward: '25',
    requirement: { type: 'lessons_completed', value: 10 },
    isActive: true
  },
  {
    id: 'streak_starter',
    title: 'Streak Starter',
    description: 'Maintain a 3-day check-in streak',
    icon: '🔥',
    xpReward: 100,
    paxReward: '10',
    requirement: { type: 'daily_streak', value: 3 },
    isActive: true
  },
  {
    id: 'dedicated_learner',
    title: 'Dedicated Learner',
    description: 'Maintain a 7-day check-in streak',
    icon: '💪',
    xpReward: 300,
    paxReward: '50',
    requirement: { type: 'daily_streak', value: 7 },
    isActive: true
  },
  {
    id: 'crypto_guru',
    title: 'Crypto Guru',
    description: 'Complete all available lessons',
    icon: '🧙‍♂️',
    xpReward: 500,
    paxReward: '100',
    requirement: { type: 'all_lessons_completed', value: 1 },
    isActive: true
  },
  {
    id: 'level_up',
    title: 'Level Up',
    description: 'Reach level 5',
    icon: '⭐',
    xpReward: 250,
    paxReward: '30',
    requirement: { type: 'level_reached', value: 5 },
    isActive: true
  },
  {
    id: 'challenge_champion',
    title: 'Challenge Champion',
    description: 'Complete 5 daily challenges',
    icon: '🏆',
    xpReward: 150,
    paxReward: '20',
    requirement: { type: 'challenges_completed', value: 5 },
    isActive: true
  }
];

// Daily challenge definitions
const dailyChallengesData = [
  {
    id: 'daily_checkin',
    title: 'Daily Check-in',
    description: 'Check in to the app today',
    challengeType: 'daily_checkin',
    rewardAmount: '1',
    xpReward: '10',
    target: '1',
    isActive: true
  },
  {
    id: 'complete_lesson',
    title: 'Learn Something New',
    description: 'Complete a lesson today',
    challengeType: 'lesson',
    rewardAmount: '5',
    xpReward: '25',
    target: '1',
    isActive: true
  },
  {
    id: 'swap_tokens',
    title: 'Trade Smart',
    description: 'Make a token swap today',
    challengeType: 'swap',
    rewardAmount: '3',
    xpReward: '20',
    target: '1',
    isActive: true
  },
  {
    id: 'check_portfolio',
    title: 'Portfolio Review',
    description: 'Check your portfolio balance',
    challengeType: 'portfolio_view',
    rewardAmount: '2',
    xpReward: '15',
    target: '1',
    isActive: true
  }
];

export async function seedGamificationData() {
  console.log('🌱 Seeding gamification data...');

  try {
    // Clear existing data first
    await storage.clearAllLessons();
    console.log('Cleared existing lessons');
    
    // Clear achievements and daily challenges (manually since there's no method)
    await db.delete(achievementsTable);
    await db.delete(dailyChallengesTable);
    console.log('Cleared existing achievements and challenges');

    // Seed lessons from sample data
    console.log('Seeding lessons...');
    for (const lessonData of sampleLessons) {
      await storage.createLesson({
        id: lessonData.id,
        title: lessonData.title,
        description: lessonData.description,
        content: lessonData.content,
        difficulty: lessonData.difficulty,
        rewardAmount: lessonData.rewardAmount,
        estimatedTime: lessonData.estimatedTime,
        category: lessonData.category,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ Created lesson: ${lessonData.title}`);
    }

    // Seed achievements
    console.log('Seeding achievements...');
    for (const achievementData of achievementsData) {
      await storage.createAchievement({
        id: achievementData.id,
        title: achievementData.title,
        description: achievementData.description,
        icon: achievementData.icon,
        xpReward: achievementData.xpReward,
        paxReward: achievementData.paxReward,
        requirement: achievementData.requirement,
        isActive: achievementData.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`🏅 Created achievement: ${achievementData.title}`);
    }

    // Seed daily challenges
    console.log('Seeding daily challenges...');
    for (const challengeData of dailyChallengesData) {
      await storage.createDailyChallenge({
        id: challengeData.id,
        title: challengeData.title,
        description: challengeData.description,
        challengeType: challengeData.challengeType,
        rewardAmount: challengeData.rewardAmount,
        xpReward: challengeData.xpReward,
        target: challengeData.target,
        isActive: challengeData.isActive,
        createdAt: new Date()
      });
      console.log(`🎯 Created daily challenge: ${challengeData.title}`);
    }

    console.log('🎉 Gamification data seeded successfully!');
    console.log(`📚 Seeded ${sampleLessons.length} lessons`);
    console.log(`🏅 Seeded ${achievementsData.length} achievements`);
    console.log(`🎯 Seeded ${dailyChallengesData.length} daily challenges`);

  } catch (error) {
    console.error('❌ Error seeding gamification data:', error);
    throw error;
  }
}

// Run the seeding function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGamificationData()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
