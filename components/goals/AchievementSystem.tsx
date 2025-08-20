'use client'

import { useState, useEffect } from 'react'
import { 
  TrophyIcon,
  FireIcon,
  StarIcon,
  AcademicCapIcon,
  UsersIcon,
  CheckCircleIcon,
  SparklesIcon,
  GiftIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/useTranslation'
import type { Achievement, UserAchievement, SavingsGoal } from '@/types'

interface AchievementSystemProps {
  goals?: SavingsGoal[]
  showLeaderboard?: boolean
  enableNotifications?: boolean
  onAchievementUnlocked?: (achievement: Achievement) => void
}

export function AchievementSystem({
  goals = [],
  showLeaderboard = true,
  enableNotifications = true,
  onAchievementUnlocked,
}: AchievementSystemProps) {
  const { t, isReady } = useTranslation(['goals', 'achievements', 'common'])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false)
  const [unlockAnimation, setUnlockAnimation] = useState<string | null>(null)

  if (!isReady) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
            <p className="text-neutral-gray">{t('common:status.loading', { defaultValue: 'Loading...' })}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Mock achievements data
  const achievements: Achievement[] = [
    // Savings Streaks
    {
      id: 'streak-7',
      name: 'Week Warrior',
      description: 'Save money for 7 consecutive days',
      category: 'savings-streak',
      icon: '🔥',
      requirement: '7 days consecutive saving',
      points: 50,
      isUnlocked: false,
      progress: 5,
      maxProgress: 7,
    },
    {
      id: 'streak-30',
      name: 'Month Master',
      description: 'Maintain a savings streak for 30 days',
      category: 'savings-streak',
      icon: '⭐',
      requirement: '30 days consecutive saving',
      points: 200,
      isUnlocked: false,
      progress: 5,
      maxProgress: 30,
    },
    {
      id: 'streak-90',
      name: 'Quarter Champion',
      description: 'Save consistently for 90 days',
      category: 'savings-streak',
      icon: '🏆',
      requirement: '90 days consecutive saving',
      points: 500,
      isUnlocked: false,
      progress: 5,
      maxProgress: 90,
    },

    // Goal Achievement
    {
      id: 'first-goal',
      name: 'First Goal',
      description: 'Complete your first savings goal',
      category: 'goal-achievement',
      icon: '🎯',
      requirement: 'Complete first savings goal',
      points: 100,
      isUnlocked: true,
      unlockedDate: new Date('2024-01-15'),
      progress: 1,
      maxProgress: 1,
    },
    {
      id: 'goal-crusher',
      name: 'Goal Crusher',
      description: 'Complete 5 savings goals',
      category: 'goal-achievement',
      icon: '💪',
      requirement: 'Complete 5 goals',
      points: 300,
      isUnlocked: false,
      progress: 1,
      maxProgress: 5,
    },
    {
      id: 'emergency-master',
      name: 'Emergency Fund Master',
      description: 'Build a 6-month emergency fund',
      category: 'goal-achievement',
      icon: '🛡️',
      requirement: 'Save 6 months expenses',
      points: 400,
      isUnlocked: false,
      progress: 0,
      maxProgress: 1,
    },

    // Financial Education
    {
      id: 'knowledge-seeker',
      name: 'Knowledge Seeker',
      description: 'Complete 3 financial education modules',
      category: 'financial-education',
      icon: '📚',
      requirement: 'Complete 3 education modules',
      points: 150,
      isUnlocked: false,
      progress: 1,
      maxProgress: 3,
    },
    {
      id: 'financial-guru',
      name: 'Financial Guru',
      description: 'Complete all financial education modules',
      category: 'financial-education',
      icon: '🧠',
      requirement: 'Complete all education modules',
      points: 500,
      isUnlocked: false,
      progress: 1,
      maxProgress: 10,
    },
    {
      id: 'tip-collector',
      name: 'Tip Collector',
      description: 'Read 50 financial tips',
      category: 'financial-education',
      icon: '💡',
      requirement: 'Read 50 financial tips',
      points: 100,
      isUnlocked: false,
      progress: 12,
      maxProgress: 50,
    },

    // Social Achievements
    {
      id: 'social-saver',
      name: 'Social Saver',
      description: 'Share your savings journey with friends',
      category: 'social',
      icon: '🤝',
      requirement: 'Share 3 savings milestones',
      points: 75,
      isUnlocked: false,
      progress: 1,
      maxProgress: 3,
    },
    {
      id: 'community-leader',
      name: 'Community Leader',
      description: 'Help 5 other users with financial advice',
      category: 'social',
      icon: '👑',
      requirement: 'Help 5 other users',
      points: 200,
      isUnlocked: false,
      progress: 0,
      maxProgress: 5,
    },
  ]

  // Mock user achievements
  const userAchievements: UserAchievement[] = achievements.map(achievement => ({
    id: `user-${achievement.id}`,
    achievementId: achievement.id,
    userId: 'user-123',
    isUnlocked: achievement.isUnlocked,
    unlockedDate: achievement.unlockedDate,
    progress: achievement.progress || 0,
    maxProgress: achievement.maxProgress || 1,
  }))

  // Calculate total points
  const totalPoints = achievements
    .filter(a => a.isUnlocked)
    .reduce((sum, a) => sum + a.points, 0)

  // Calculate progress for each achievement based on goals
  useEffect(() => {
    achievements.forEach(achievement => {
      switch (achievement.id) {
        case 'first-goal':
          if (goals.some(g => !g.isActive)) {
            achievement.isUnlocked = true
            achievement.progress = 1
          }
          break
        case 'goal-crusher':
          const completedGoals = goals.filter(g => !g.isActive).length
          achievement.progress = Math.min(completedGoals, 5)
          if (completedGoals >= 5) {
            achievement.isUnlocked = true
          }
          break
        case 'emergency-master':
          const emergencyGoal = goals.find(g => g.category === 'emergency' && g.isActive)
          if (emergencyGoal) {
            const progress = emergencyGoal.currentAmount / emergencyGoal.targetAmount
            achievement.progress = progress >= 1 ? 1 : 0
            if (progress >= 1) {
              achievement.isUnlocked = true
            }
          }
          break
      }
    })
  }, [goals, achievements])

  // Trigger unlock animation
  const triggerUnlock = (achievementId: string) => {
    setUnlockAnimation(achievementId)
    setTimeout(() => setUnlockAnimation(null), 3000)
    
    if (onAchievementUnlocked) {
      const achievement = achievements.find(a => a.id === achievementId)
      if (achievement) {
        onAchievementUnlocked(achievement)
      }
    }
  }

  // Filter achievements based on selection
  const filteredAchievements = achievements.filter(achievement => {
    if (selectedCategory !== 'all' && achievement.category !== selectedCategory) {
      return false
    }
    if (showUnlockedOnly && !achievement.isUnlocked) {
      return false
    }
    return true
  })

  const categories = [
    { id: 'all', name: t('achievements:categories.all', { defaultValue: 'All' }), icon: '🏆' },
    { id: 'savings-streak', name: t('achievements:categories.savingsStreak', { defaultValue: 'Savings Streaks' }), icon: '🔥' },
    { id: 'goal-achievement', name: t('achievements:categories.goalAchievement', { defaultValue: 'Goal Achievement' }), icon: '🎯' },
    { id: 'financial-education', name: t('achievements:categories.financialEducation', { defaultValue: 'Financial Education' }), icon: '📚' },
    { id: 'social', name: t('achievements:categories.social', { defaultValue: 'Social' }), icon: '🤝' },
  ]

  const renderAchievementCard = (achievement: Achievement) => {
    const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id)
    const progress = userAchievement ? (userAchievement.progress / userAchievement.maxProgress) * 100 : 0
    const isUnlocked = achievement.isUnlocked

    return (
      <motion.div
        key={achievement.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative"
      >
        <Card className={`h-full transition-all duration-300 ${
          isUnlocked 
            ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300' 
            : 'hover:shadow-lg'
        }`}>
          <CardContent className="p-6">
            {/* Achievement Header */}
            <div className="flex items-start space-x-4 mb-4">
              <div className="relative">
                <div className={`text-4xl ${isUnlocked ? 'animate-bounce' : ''}`}>
                  {achievement.icon}
                </div>
                {isUnlocked && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2"
                  >
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  </motion.div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{achievement.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-600">
                      {achievement.points} pts
                    </span>
                    {isUnlocked && (
                      <StarIcon className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                
                {/* Category Badge */}
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  achievement.category === 'savings-streak' ? 'bg-red-100 text-red-800' :
                  achievement.category === 'goal-achievement' ? 'bg-green-100 text-green-800' :
                  achievement.category === 'financial-education' ? 'bg-blue-100 text-blue-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {categories.find(c => c.id === achievement.category)?.name}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {t('achievements:progress', { defaultValue: 'Progress' })}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {userAchievement?.progress || 0} / {userAchievement?.maxProgress || 1}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className={`h-2 rounded-full ${
                    isUnlocked ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Requirement */}
            <div className="text-sm text-gray-600 mb-4">
              <strong>{t('achievements:requirement', { defaultValue: 'Requirement' })}:</strong> {achievement.requirement}
            </div>

            {/* Unlock Date */}
            {isUnlocked && achievement.unlockedDate && (
              <div className="text-sm text-green-600 mb-4">
                <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                {t('achievements:unlocked', { defaultValue: 'Unlocked' })} {achievement.unlockedDate.toLocaleDateString()}
              </div>
            )}

            {/* Action Button */}
            {!isUnlocked && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => triggerUnlock(achievement.id)}
              >
                {t('achievements:actions.workTowards', { defaultValue: 'Work Towards This' })}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Unlock Animation */}
        <AnimatePresence>
          {unlockAnimation === achievement.id && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <div className="text-8xl">🎉</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Points */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('achievements:title', { defaultValue: 'Achievement System' })}
          </h2>
          <p className="text-gray-600">
            {t('achievements:subtitle', { defaultValue: 'Earn badges and points for your financial progress' })}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Total Points Display */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalPoints}</div>
              <div className="text-xs opacity-90">
                {t('achievements:totalPoints', { defaultValue: 'Total Points' })}
              </div>
            </div>
          </div>
          
          {/* Show Unlocked Only Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUnlockedOnly(!showUnlockedOnly)}
          >
            {showUnlockedOnly 
              ? t('achievements:showAll', { defaultValue: 'Show All' })
              : t('achievements:showUnlocked', { defaultValue: 'Show Unlocked' })
            }
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all ${
              selectedCategory === category.id
                ? 'border-primary-trust-blue bg-blue-50 text-primary-trust-blue'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <span className="text-lg">{category.icon}</span>
            <span className="font-medium">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredAchievements.map(achievement => renderAchievementCard(achievement))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredAchievements.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('achievements:empty.title', { defaultValue: 'No achievements found' })}
          </h3>
          <p className="text-gray-600 mb-6">
            {t('achievements:empty.description', { defaultValue: 'Try adjusting your filters or start working towards your first achievement!' })}
          </p>
        </motion.div>
      )}

      {/* Leaderboard Preview */}
      {showLeaderboard && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <UsersIcon className="w-5 h-5 text-purple-600 mr-2" />
              {t('achievements:leaderboard.title', { defaultValue: 'Community Leaderboard' })}
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🥇</span>
                  <div>
                    <div className="font-medium text-gray-900">Sarah M.</div>
                    <div className="text-sm text-gray-600">Financial Guru</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600">2,450 pts</div>
                  <div className="text-sm text-gray-500">15 achievements</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🥈</span>
                  <div>
                    <div className="font-medium text-gray-900">Mike R.</div>
                    <div className="text-sm text-gray-600">Savings Champion</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-600">1,890 pts</div>
                  <div className="text-sm text-gray-500">12 achievements</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🥉</span>
                  <div>
                    <div className="font-medium text-gray-900">Lisa K.</div>
                    <div className="text-sm text-gray-600">Goal Setter</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-yellow-600">1,320 pts</div>
                  <div className="text-sm text-gray-500">10 achievements</div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm">
                {t('achievements:leaderboard.viewFull', { defaultValue: 'View Full Leaderboard' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
