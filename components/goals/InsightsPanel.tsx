'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  UsersIcon,
  TrendingUpIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FireIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/useTranslation'
import { useCurrency } from '@/lib/useCurrency'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { SavingsGoal, SocialProof, QuickSaveData } from '@/types'

interface InsightsPanelProps {
  goals?: SavingsGoal[]
  quickSaveHistory?: QuickSaveData[]
  showPeerComparison?: boolean
  showRiskAwareness?: boolean
  showTrends?: boolean
}

export function InsightsPanel({
  goals = [],
  quickSaveHistory = [],
  showPeerComparison = true,
  showRiskAwareness = true,
  showTrends = true,
}: InsightsPanelProps) {
  const { t, isReady } = useTranslation(['goals', 'insights', 'common'])
  const { formatCurrency } = useCurrency()
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month')
  const [activeTab, setActiveTab] = useState<'overview' | 'peer' | 'trends' | 'risks'>('overview')

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

  // Mock peer comparison data
  const peerData = {
    ageGroup: '25-34',
    incomeLevel: '$50k-$75k',
    region: 'West Coast',
    peerStats: {
      averageEmergencyFund: 8500,
      averageSavingsRate: 15,
      averageGoalCompletion: 68,
      topSavingsTime: '5:30 PM',
      mostPopularGoal: 'Emergency Fund',
      averageMonthlySave: 450,
    },
    userPercentile: {
      emergencyFund: 75, // Top 25%
      savingsRate: 60,   // Top 40%
      goalCompletion: 80, // Top 20%
    }
  }

  // Mock trend data
  const trendData = {
    weekly: [
      { day: 'Mon', saves: 23, amount: 1250 },
      { day: 'Tue', saves: 28, amount: 1580 },
      { day: 'Wed', saves: 31, amount: 1820 },
      { day: 'Thu', saves: 26, amount: 1450 },
      { day: 'Fri', saves: 35, amount: 2100 },
      { day: 'Sat', saves: 19, amount: 980 },
      { day: 'Sun', saves: 22, amount: 1200 },
    ],
    monthly: [
      { month: 'Jan', saves: 120, amount: 6800 },
      { month: 'Feb', saves: 135, amount: 7200 },
      { month: 'Mar', saves: 142, amount: 8100 },
      { month: 'Apr', saves: 128, amount: 7500 },
      { month: 'May', saves: 156, amount: 8900 },
      { month: 'Jun', saves: 148, amount: 8200 },
    ],
    quarterly: [
      { quarter: 'Q1', saves: 397, amount: 22100 },
      { quarter: 'Q2', saves: 432, amount: 24600 },
    ]
  }

  // Mock risk awareness data
  const riskData = {
    emergencyFundRisk: {
      title: 'Emergency Fund Status',
      risk: 'medium',
      message: 'You have 3.2 months of expenses saved. Consider building to 6 months.',
      recommendation: 'Save an additional $2,800 to reach 6-month coverage.',
      impact: 'High - Unexpected expenses could lead to debt',
      probability: '67% of people face unexpected expenses yearly',
    },
    debtRisk: {
      title: 'Debt Prevention',
      risk: 'low',
      message: 'Great job! Your emergency fund helps prevent high-interest debt.',
      recommendation: 'Continue building your emergency fund.',
      impact: 'Medium - Reduces risk of credit card debt',
      probability: 'You\'re in the top 30% for debt prevention',
    },
    savingsConsistency: {
      title: 'Savings Consistency',
      risk: 'low',
      message: 'You\'ve saved consistently for 5 months. Keep it up!',
      recommendation: 'Maintain your current savings rhythm.',
      impact: 'High - Consistent saving builds long-term wealth',
      probability: 'You\'re in the top 25% for consistency',
    }
  }

  // Calculate user statistics
  const userStats = {
    totalGoals: goals.length,
    activeGoals: goals.filter(g => g.isActive).length,
    completedGoals: goals.filter(g => !g.isActive).length,
    totalSaved: goals.reduce((sum, g) => sum + g.currentAmount, 0),
    totalTarget: goals.reduce((sum, g) => sum + g.targetAmount, 0),
    averageProgress: goals.length > 0 
      ? goals.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount), 0) / goals.length * 100
      : 0,
    emergencyFundProgress: goals.find(g => g.category === 'emergency')?.currentAmount || 0,
    monthlySavings: quickSaveHistory
      .filter(save => {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return save.timestamp > monthAgo
      })
      .reduce((sum, save) => sum + save.amount, 0),
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high': return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
      case 'medium': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
      case 'low': return <ShieldCheckIcon className="w-5 h-5 text-green-600" />
      default: return <ShieldCheckIcon className="w-5 h-5 text-gray-600" />
    }
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{userStats.totalGoals}</div>
              <div className="text-sm text-blue-800">
                {t('insights:metrics.totalGoals', { defaultValue: 'Total Goals' })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{userStats.completedGoals}</div>
              <div className="text-sm text-green-800">
                {t('insights:metrics.completedGoals', { defaultValue: 'Completed' })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(userStats.averageProgress)}%</div>
              <div className="text-sm text-purple-800">
                {t('insights:metrics.averageProgress', { defaultValue: 'Avg Progress' })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(userStats.monthlySavings)}</div>
              <div className="text-sm text-orange-800">
                {t('insights:metrics.monthlySavings', { defaultValue: 'This Month' })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('insights:overview.progress.title', { defaultValue: 'Goal Progress Overview' })}
          </h3>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={goals.map(goal => ({
                name: goal.name,
                current: goal.currentAmount,
                target: goal.targetAmount,
                progress: (goal.currentAmount / goal.targetAmount) * 100
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="current" fill="#3b82f6" name="Current" />
                <Bar dataKey="target" fill="#e5e7eb" name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderPeerComparisonTab = () => (
    <div className="space-y-6">
      {/* Peer Comparison Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <UsersIcon className="w-8 h-8 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">
              {t('insights:peer.comparison.title', { defaultValue: 'How You Compare to Peers' })}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                Top {100 - peerData.userPercentile.emergencyFund}%
              </div>
              <div className="text-sm text-gray-600">
                {t('insights:peer.emergencyFund', { defaultValue: 'Emergency Fund' })}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                vs {peerData.peerStats.averageEmergencyFund} avg
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                Top {100 - peerData.userPercentile.savingsRate}%
              </div>
              <div className="text-sm text-gray-600">
                {t('insights:peer.savingsRate', { defaultValue: 'Savings Rate' })}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                vs {peerData.peerStats.averageSavingsRate}% avg
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                Top {100 - peerData.userPercentile.goalCompletion}%
              </div>
              <div className="text-sm text-gray-600">
                {t('insights:peer.goalCompletion', { defaultValue: 'Goal Completion' })}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                vs {peerData.peerStats.averageGoalCompletion}% avg
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peer Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h4 className="text-lg font-semibold text-gray-900">
              {t('insights:peer.insights.title', { defaultValue: 'Peer Insights' })}
            </h4>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <TrendingUpIcon className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">
                  {t('insights:peer.insights.popularTime', { defaultValue: 'Most Popular Save Time' })}
                </div>
                <div className="text-sm text-gray-600">{peerData.peerStats.topSavingsTime}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <FireIcon className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium text-gray-900">
                  {t('insights:peer.insights.popularGoal', { defaultValue: 'Most Popular Goal' })}
                </div>
                <div className="text-sm text-gray-600">{peerData.peerStats.mostPopularGoal}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
              <ChartBarIcon className="w-5 h-5 text-purple-600" />
              <div>
                <div className="font-medium text-gray-900">
                  {t('insights:peer.insights.averageSave', { defaultValue: 'Average Monthly Save' })}
                </div>
                <div className="text-sm text-gray-600">{formatCurrency(peerData.peerStats.averageMonthlySave)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h4 className="text-lg font-semibold text-gray-900">
              {t('insights:peer.demographics.title', { defaultValue: 'Your Peer Group' })}
            </h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-600">{t('insights:peer.demographics.age', { defaultValue: 'Age Group' })}</span>
                <span className="font-medium">{peerData.ageGroup}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-600">{t('insights:peer.demographics.income', { defaultValue: 'Income Level' })}</span>
                <span className="font-medium">{peerData.incomeLevel}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-600">{t('insights:peer.demographics.region', { defaultValue: 'Region' })}</span>
                <span className="font-medium">{peerData.region}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderTrendsTab = () => (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex space-x-2">
        {(['week', 'month', 'quarter'] as const).map((timeframe) => (
          <Button
            key={timeframe}
            variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeframe(timeframe)}
          >
            {t(`insights:trends.timeframes.${timeframe}`, { 
              defaultValue: timeframe === 'week' ? 'Week' : timeframe === 'month' ? 'Month' : 'Quarter' 
            })}
          </Button>
        ))}
      </div>

      {/* Trends Chart */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('insights:trends.savings.title', { defaultValue: 'Savings Trends' })}
          </h3>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData[selectedTimeframe]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={selectedTimeframe === 'week' ? 'day' : selectedTimeframe === 'month' ? 'month' : 'quarter'} />
                <YAxis tickFormatter={(value) => selectedTimeframe === 'week' ? value.toString() : `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [
                    selectedTimeframe === 'week' ? value.toString() : `$${value.toLocaleString()}`,
                    selectedTimeframe === 'week' ? 'Saves' : 'Amount'
                  ]}
                />
                <Bar dataKey={selectedTimeframe === 'week' ? 'saves' : 'amount'} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Trend Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h4 className="text-lg font-semibold text-gray-900">
              {t('insights:trends.insights.title', { defaultValue: 'Trend Insights' })}
            </h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <ArrowUpIcon className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">
                    {t('insights:trends.insights.improving', { defaultValue: 'Improving' })
                  </div>
                  <div className="text-sm text-gray-600">
                    {t('insights:trends.insights.improvingDesc', { defaultValue: 'Your savings consistency is improving month over month' })}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <LightBulbIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">
                    {t('insights:trends.insights.opportunity', { defaultValue: 'Opportunity' })
                  </div>
                  <div className="text-sm text-gray-600">
                    {t('insights:trends.insights.opportunityDesc', { defaultValue: 'Consider increasing your monthly savings target' })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h4 className="text-lg font-semibold text-gray-900">
              {t('insights:trends.recommendations.title', { defaultValue: 'Recommendations' })}
            </h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-900">
                  {t('insights:trends.recommendations.consistency', { defaultValue: 'Maintain Consistency' })
                </div>
                <div className="text-sm text-blue-700">
                  {t('insights:trends.recommendations.consistencyDesc', { defaultValue: 'Your weekly saving pattern is strong. Keep it up!' })}
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="font-medium text-green-900">
                  {t('insights:trends.recommendations.increase', { defaultValue: 'Consider Increase' })
                </div>
                <div className="text-sm text-green-700">
                  {t('insights:trends.recommendations.increaseDesc', { defaultValue: 'You could increase your monthly savings by 15%' })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderRisksTab = () => (
    <div className="space-y-6">
      {/* Risk Summary */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            <h3 className="text-xl font-semibold text-gray-900">
              {t('insights:risks.summary.title', { defaultValue: 'Financial Risk Assessment' })}
            </h3>
          </div>
          
          <p className="text-gray-700 mb-4">
            {t('insights:risks.summary.description', { 
              defaultValue: 'Based on your current financial situation, here\'s an assessment of potential risks and recommendations to improve your financial resilience.' 
            })}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-red-600">1</div>
              <div className="text-sm text-red-800">
                {t('insights:risks.summary.highRisk', { defaultValue: 'High Risk' })
              </div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">1</div>
              <div className="text-sm text-yellow-800">
                {t('insights:risks.summary.mediumRisk', { defaultValue: 'Medium Risk' })
              </div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-600">1</div>
              <div className="text-sm text-green-800">
                {t('insights:risks.summary.lowRisk', { defaultValue: 'Low Risk' })
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Details */}
      <div className="space-y-4">
        {Object.entries(riskData).map(([key, risk]) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className={`border-l-4 ${
              risk.risk === 'high' ? 'border-red-500' :
              risk.risk === 'medium' ? 'border-yellow-500' :
              'border-green-500'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getRiskIcon(risk.risk)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{risk.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(risk.risk)}`}>
                        {risk.risk.toUpperCase()} RISK
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{risk.message}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="font-medium text-gray-900 mb-1">
                          {t('insights:risks.recommendation', { defaultValue: 'Recommendation' })}
                        </div>
                        <p className="text-sm text-gray-600">{risk.recommendation}</p>
                      </div>
                      
                      <div>
                        <div className="font-medium text-gray-900 mb-1">
                          {t('insights:risks.impact', { defaultValue: 'Potential Impact' })}
                        </div>
                        <p className="text-sm text-gray-600">{risk.impact}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">
                        <strong>{t('insights:risks.probability', { defaultValue: 'Probability' })}:</strong> {risk.probability}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('insights:title', { defaultValue: 'Financial Insights' })}
          </h2>
          <p className="text-gray-600">
            {t('insights:subtitle', { defaultValue: 'Get personalized insights and peer comparisons to improve your financial health' })}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: t('insights:tabs.overview', { defaultValue: 'Overview' }), icon: ChartBarIcon },
            { id: 'peer', label: t('insights:tabs.peer', { defaultValue: 'Peer Comparison' }), icon: UsersIcon },
            { id: 'trends', label: t('insights:tabs.trends', { defaultValue: 'Trends' }), icon: TrendingUpIcon },
            { id: 'risks', label: t('insights:tabs.risks', { defaultValue: 'Risk Assessment' }), icon: ExclamationTriangleIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-trust-blue text-primary-trust-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'peer' && renderPeerComparisonTab()}
          {activeTab === 'trends' && renderTrendsTab()}
          {activeTab === 'risks' && renderRisksTab()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
