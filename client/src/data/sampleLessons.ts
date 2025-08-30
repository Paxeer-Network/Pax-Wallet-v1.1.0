export const sampleLessons = [
  {
    id: "intro-crypto",
    title: "What is Cryptocurrency?",
    description: "Learn the basics of digital currency and blockchain",
    difficulty: "beginner",
    category: "basics",
    estimatedTime: "2 min",
    rewardAmount: "10",
    xpReward: 50,
    content: JSON.stringify({
      chapters: [
        {
          title: "Digital Money Revolution",
          content: "Cryptocurrency is digital money that exists only online. Unlike traditional money controlled by banks, crypto uses blockchain technology to let people send money directly to each other without middlemen.",
          keyPoints: [
            "Digital money that exists only online",
            "No banks or middlemen needed",
            "Uses blockchain technology for security",
            "People control their own money"
          ],
          quiz: {
            question: "What makes cryptocurrency different from traditional money?",
            options: [
              "It's only used online",
              "It doesn't need banks or middlemen",
              "It uses blockchain technology",
              "All of the above"
            ],
            correct: 3,
            explanation: "Cryptocurrency combines all these features - it's digital, decentralized, and uses blockchain technology."
          }
        }
      ]
    })
  },
  {
    id: "paxeer-network",
    title: "Understanding Paxeer Network",
    description: "Discover what makes Paxeer special in the crypto world",
    difficulty: "beginner",
    category: "paxeer",
    estimatedTime: "2 min",
    rewardAmount: "10",
    xpReward: 50,
    content: JSON.stringify({
      chapters: [
        {
          title: "The Paxeer Advantage",
          content: "Paxeer is a next-generation blockchain network designed for speed, low fees, and ease of use. It's built specifically for decentralized finance (DeFi) applications like trading, lending, and earning rewards.",
          keyPoints: [
            "Fast transactions under 3 seconds",
            "Low fees under $0.01 per transaction",
            "Built specifically for DeFi applications",
            "User-friendly for beginners"
          ],
          quiz: {
            question: "What is Paxeer's main advantage for users?",
            options: [
              "High fees for security",
              "Slow transactions for safety",
              "Fast and cheap transactions",
              "Limited functionality"
            ],
            correct: 2,
            explanation: "Paxeer focuses on providing fast transactions with very low fees, making DeFi accessible to everyone."
          }
        }
      ]
    })
  },
  {
    id: "defi-basics",
    title: "DeFi Fundamentals",
    description: "Learn about Decentralized Finance and its benefits",
    difficulty: "intermediate",
    category: "defi",
    estimatedTime: "2 min",
    rewardAmount: "10",
    xpReward: 75,
    content: JSON.stringify({
      chapters: [
        {
          title: "Financial Freedom with DeFi",
          content: "DeFi (Decentralized Finance) recreates traditional financial services like banks, loans, and trading on the blockchain. Instead of relying on banks, smart contracts automatically handle transactions, making finance more accessible and transparent.",
          keyPoints: [
            "No banks needed - smart contracts handle everything",
            "Available 24/7 globally",
            "Transparent - all transactions visible",
            "Higher potential returns than traditional banks"
          ],
          quiz: {
            question: "How does DeFi differ from traditional banking?",
            options: [
              "Uses smart contracts instead of bank employees",
              "Available 24/7 without bank hours",
              "More transparent with visible transactions",
              "All of the above"
            ],
            correct: 3,
            explanation: "DeFi combines automation, accessibility, and transparency to revolutionize traditional finance."
          }
        }
      ]
    })
  },
  {
    id: "wallet-security",
    title: "Keeping Your Crypto Safe",
    description: "Essential security practices for crypto users",
    difficulty: "beginner",
    category: "security",
    estimatedTime: "2 min",
    rewardAmount: "10",
    xpReward: 60,
    content: JSON.stringify({
      chapters: [
        {
          title: "Your Crypto, Your Responsibility",
          content: "In crypto, you are your own bank. This means you control your money completely, but you're also responsible for keeping it safe. The most important rule: never share your private keys or seed phrase with anyone.",
          keyPoints: [
            "You control your own money (not a bank)",
            "Never share private keys or seed phrases",
            "Always double-check wallet addresses",
            "Use secure networks when transacting"
          ],
          quiz: {
            question: "What should you NEVER share with anyone?",
            options: [
              "Your wallet address",
              "Your private keys and seed phrase",
              "Your transaction history",
              "Your favorite crypto"
            ],
            correct: 1,
            explanation: "Private keys and seed phrases give complete control over your wallet. Never share them with anyone!"
          }
        }
      ]
    })
  },
  {
    id: "trading-basics",
    title: "Smart Trading Strategies",
    description: "Learn fundamental trading concepts and risk management",
    difficulty: "intermediate",
    category: "trading",
    estimatedTime: "2 min",
    rewardAmount: "10",
    xpReward: 75,
    content: JSON.stringify({
      chapters: [
        {
          title: "Trade Smart, Not Hard",
          content: "Successful trading isn't about getting rich quick - it's about making informed decisions and managing risk. Start small, learn from each trade, and never invest more than you can afford to lose.",
          keyPoints: [
            "Start with small amounts while learning",
            "Set stop-losses to limit potential losses",
            "Don't let emotions drive your decisions",
            "Research before making any trade"
          ],
          quiz: {
            question: "What's the most important rule for new traders?",
            options: [
              "Trade with all your money for maximum profit",
              "Follow other people's trades exactly",
              "Never invest more than you can afford to lose",
              "Trade based on emotions and gut feelings"
            ],
            correct: 2,
            explanation: "Risk management is crucial. Only trade with money you can afford to lose while learning."
          }
        }
      ]
    })
  },
  {
    id: "yield-farming",
    title: "Earning with Yield Farming",
    description: "Understand how to earn passive income in DeFi",
    difficulty: "advanced",
    category: "defi",
    estimatedTime: "2 min",
    rewardAmount: "10",
    xpReward: 100,
    content: JSON.stringify({
      chapters: [
        {
          title: "Put Your Crypto to Work",
          content: "Yield farming lets you earn rewards by providing liquidity to DeFi protocols. You deposit tokens into liquidity pools, and in return, you earn fees from trades plus additional token rewards. It's like earning interest, but potentially much higher.",
          keyPoints: [
            "Provide liquidity to earn trading fees",
            "Receive additional token rewards",
            "Higher risk but potentially higher returns",
            "Requires understanding of impermanent loss"
          ],
          quiz: {
            question: "What is the main risk of yield farming?",
            options: [
              "Earning too much money",
              "Impermanent loss from price changes",
              "Getting too many reward tokens",
              "Having to pay high fees"
            ],
            correct: 1,
            explanation: "Impermanent loss occurs when token prices change significantly while you're providing liquidity."
          }
        }
      ]
    })
  }
];

export const sampleAchievements = [
  {
    id: "first-lesson",
    title: "First Steps",
    description: "Complete your first lesson",
    icon: "BookOpen",
    unlocked: false
  },
  {
    id: "week-streak",
    title: "Week Warrior",
    description: "Maintain a 7-day check-in streak",
    icon: "Flame",
    unlocked: false
  },
  {
    id: "knowledge-seeker",
    title: "Knowledge Seeker",
    description: "Complete 10 lessons",
    icon: "Trophy",
    unlocked: false
  },
  {
    id: "crypto-expert",
    title: "Crypto Expert",
    description: "Complete all beginner lessons",
    icon: "Crown",
    unlocked: false
  },
  {
    id: "pax-collector",
    title: "PAX Collector",
    description: "Earn 100 PAX from lessons",
    icon: "Coins",
    unlocked: false
  }
];

export const sampleDailyChallenges = [
  {
    id: "daily-trader",
    title: "Daily Trader",
    description: "Complete 1 swap today",
    rewardAmount: "5",
    xpReward: 25,
    target: 1,
    progress: 0,
    completed: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "lesson-learner",
    title: "Lesson Learner",
    description: "Complete 2 lessons today",
    rewardAmount: "8",
    xpReward: 40,
    target: 2,
    progress: 0,
    completed: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "explorer",
    title: "Portfolio Explorer",
    description: "Check your portfolio 3 times today",
    rewardAmount: "3",
    xpReward: 15,
    target: 3,
    progress: 0,
    completed: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
];
