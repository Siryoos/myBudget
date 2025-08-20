'use client'

import { useState, useRef } from 'react'
import { 
  PlusIcon,
  SparklesIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  HomeIcon,
  AcademicCapIcon,
  HeartIcon,
  TruckIcon,
  BeakerIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { sanitizeNumberInput, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/useTranslation'
import { useCurrency } from '@/lib/useCurrency'
import type { SavingsGoal, GoalCategory, GoalPhoto } from '@/types'

interface GoalTemplate {
  id: GoalCategory
  name: string
  icon: any
  suggestedAmount: number
  suggestedTimeframe: number // months
  description: string
  tips: string[]
  // Behavioral enhancement fields
  lossAvoidanceFrame: string
  achievementFrame: string
  riskAwareness: string
}

interface GoalWizardProps {
  templates?: string[]
  visualGoalSetting?: boolean
  milestoneBreakdown?: boolean
  onGoalCreated?: (goal: Partial<SavingsGoal>) => void
}

export function GoalWizard({
  templates = ['Emergency Fund', 'Vacation', 'Home Down Payment', 'Car Purchase', 'Wedding', 'Education', 'Retirement', 'Custom'],
  visualGoalSetting = true,
  milestoneBreakdown = true,
  onGoalCreated,
}: GoalWizardProps) {
  const { t, isReady } = useTranslation(['goals', 'common'])
  const { formatCurrency } = useCurrency()
  const [showWizard, setShowWizard] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null)
  const [goalData, setGoalData] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    framingType: 'achievement' as 'achievement' | 'loss-avoidance',
    photoUrl: '',
  })
  const [uploadedPhoto, setUploadedPhoto] = useState<GoalPhoto | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const goalTemplates: GoalTemplate[] = [
    {
      id: 'emergency',
      name: t('goals:templates.emergency.name', { defaultValue: 'Emergency Fund' }),
      icon: BanknotesIcon,
      suggestedAmount: 10000,
      suggestedTimeframe: 12,
      description: t('goals:templates.emergency.description', { defaultValue: 'Build a safety net for unexpected expenses' }),
      tips: [
        t('goals:templates.emergency.tips.amount', { defaultValue: 'Aim for 3-6 months of expenses' }),
        t('goals:templates.emergency.tips.account', { defaultValue: 'Keep in high-yield savings' }),
        t('goals:templates.emergency.tips.automate', { defaultValue: 'Automate contributions' })
      ],
      lossAvoidanceFrame: t('goals:templates.emergency.lossAvoidance', { defaultValue: 'Avoid financial crisis and high-interest debt from unexpected expenses' }),
      achievementFrame: t('goals:templates.emergency.achievement', { defaultValue: 'Build financial security and peace of mind' }),
      riskAwareness: t('goals:templates.emergency.risk', { defaultValue: '6 in 10 people face unexpected expenses yearly that could lead to debt' }),
    },
    {
      id: 'vacation',
      name: t('goals:templates.vacation.name', { defaultValue: 'Dream Vacation' }),
      icon: SparklesIcon,
      suggestedAmount: 3000,
      suggestedTimeframe: 8,
      description: t('goals:templates.vacation.description', { defaultValue: 'Save for your perfect getaway' }),
      tips: [
        t('goals:templates.vacation.tips.research', { defaultValue: 'Research costs early' }),
        t('goals:templates.vacation.tips.booking', { defaultValue: 'Book in advance for deals' }),
        t('goals:templates.vacation.tips.offseason', { defaultValue: 'Consider off-season travel' })
      ],
      lossAvoidanceFrame: t('goals:templates.vacation.lossAvoidance', { defaultValue: 'Avoid vacation debt and high-interest credit card charges' }),
      achievementFrame: t('goals:templates.vacation.achievement', { defaultValue: 'Create unforgettable memories without financial stress' }),
      riskAwareness: t('goals:templates.vacation.risk', { defaultValue: 'Vacation debt takes 8 months on average to pay off' }),
    },
    {
      id: 'home',
      name: t('goals:templates.home.name', { defaultValue: 'Home Down Payment' }),
      icon: HomeIcon,
      suggestedAmount: 50000,
      suggestedTimeframe: 36,
      description: t('goals:templates.home.description', { defaultValue: 'Save for your dream home' }),
      tips: [
        t('goals:templates.home.tips.downpayment', { defaultValue: 'Aim for 20% down payment' }),
        t('goals:templates.home.tips.closing', { defaultValue: 'Factor in closing costs' }),
        t('goals:templates.home.tips.programs', { defaultValue: 'Consider first-time buyer programs' })
      ],
      lossAvoidanceFrame: t('goals:templates.home.lossAvoidance', { defaultValue: 'Avoid PMI and higher monthly mortgage payments' }),
      achievementFrame: t('goals:templates.home.achievement', { defaultValue: 'Build equity and reduce long-term housing costs' }),
      riskAwareness: t('goals:templates.home.risk', { defaultValue: 'PMI adds $100-200 monthly until 20% equity is reached' }),
    },
    {
      id: 'car',
      name: t('goals:templates.car.name', { defaultValue: 'Car Purchase' }),
      icon: TruckIcon,
      suggestedAmount: 25000,
      suggestedTimeframe: 18,
      description: t('goals:templates.car.description', { defaultValue: 'Buy your next vehicle with cash' }),
      tips: [
        t('goals:templates.car.tips.depreciation', { defaultValue: 'Research depreciation rates' }),
        t('goals:templates.car.tips.certified', { defaultValue: 'Consider certified pre-owned' }),
        t('goals:templates.car.tips.insurance', { defaultValue: 'Factor in insurance costs' })
      ],
      lossAvoidanceFrame: t('goals:templates.car.lossAvoidance', { defaultValue: 'Avoid auto loan interest and negative equity' }),
      achievementFrame: t('goals:templates.car.achievement', { defaultValue: 'Own your vehicle outright and reduce monthly expenses' }),
      riskAwareness: t('goals:templates.car.risk', { defaultValue: 'Auto loans average 5-7% interest, adding thousands to total cost' }),
    },
    {
      id: 'wedding',
      name: t('goals:templates.wedding.name', { defaultValue: 'Wedding' }),
      icon: HeartIcon,
      suggestedAmount: 15000,
      suggestedTimeframe: 24,
      description: t('goals:templates.wedding.description', { defaultValue: 'Your special day without financial stress' }),
      tips: [
        t('goals:templates.wedding.tips.prioritize', { defaultValue: 'Prioritize what matters most' }),
        t('goals:templates.wedding.tips.negotiate', { defaultValue: 'Negotiate with vendors' }),
        t('goals:templates.wedding.tips.alternatives', { defaultValue: 'Consider cost-effective alternatives' })
      ],
      lossAvoidanceFrame: t('goals:templates.wedding.lossAvoidance', { defaultValue: 'Avoid starting marriage with wedding debt and stress' }),
      achievementFrame: t('goals:templates.wedding.achievement', { defaultValue: 'Celebrate your love with financial freedom' }),
      riskAwareness: t('goals:templates.wedding.risk', { defaultValue: 'Wedding debt can take 2-3 years to pay off' }),
    },
    {
      id: 'education',
      name: t('goals:templates.education.name', { defaultValue: 'Education' }),
      icon: AcademicCapIcon,
      suggestedAmount: 25000,
      suggestedTimeframe: 48,
      description: t('goals:templates.education.description', { defaultValue: 'Invest in your future through learning' }),
      tips: [
        t('goals:templates.education.tips.scholarships', { defaultValue: 'Apply for scholarships and grants' }),
        t('goals:templates.education.tips.community', { defaultValue: 'Consider community college first' }),
        t('goals:templates.education.tips.workstudy', { defaultValue: 'Look into work-study programs' })
      ],
      lossAvoidanceFrame: t('goals:templates.education.lossAvoidance', { defaultValue: 'Avoid student loan debt and interest accumulation' }),
      achievementFrame: t('goals:templates.education.achievement', { defaultValue: 'Invest in skills that increase earning potential' }),
      riskAwareness: t('goals:templates.education.risk', { defaultValue: 'Student loan interest can double the total cost over time' }),
    },
    {
      id: 'retirement',
      name: t('goals:templates.retirement.name', { defaultValue: 'Retirement' }),
      icon: BeakerIcon,
      suggestedAmount: 1000000,
      suggestedTimeframe: 360,
      description: t('goals:templates.retirement.description', { defaultValue: 'Secure your golden years' }),
      tips: [
        t('goals:templates.retirement.tips.start', { defaultValue: 'Start early, compound interest is powerful' }),
        t('goals:templates.retirement.tips.employer', { defaultValue: 'Maximize employer matching' }),
        t('goals:templates.retirement.tips.diversify', { defaultValue: 'Diversify your investments' })
      ],
      lossAvoidanceFrame: t('goals:templates.retirement.lossAvoidance', { defaultValue: 'Avoid working longer than desired or reducing lifestyle in retirement' }),
      achievementFrame: t('goals:templates.retirement.achievement', { defaultValue: 'Build wealth and financial independence for your future' }),
      riskAwareness: t('goals:templates.retirement.risk', { defaultValue: 'Starting 10 years late can require 3x the monthly savings' }),
    },
    {
      id: 'custom',
      name: t('goals:templates.custom.name', { defaultValue: 'Custom Goal' }),
      icon: PlusIcon,
      suggestedAmount: 5000,
      suggestedTimeframe: 12,
      description: t('goals:templates.custom.description', { defaultValue: 'Create your own personalized goal' }),
      tips: [
        t('goals:templates.custom.tips.specific', { defaultValue: 'Be specific about what you want' }),
        t('goals:templates.custom.tips.realistic', { defaultValue: 'Set realistic timelines' }),
        t('goals:templates.custom.tips.flexible', { defaultValue: 'Stay flexible and adjust as needed' })
      ],
      lossAvoidanceFrame: t('goals:templates.custom.lossAvoidance', { defaultValue: 'Avoid the cost of not planning and missing opportunities' }),
      achievementFrame: t('goals:templates.custom.achievement', { defaultValue: 'Achieve your personal dreams and aspirations' }),
      riskAwareness: t('goals:templates.custom.risk', { defaultValue: 'Goals without planning are 3x less likely to be achieved' }),
    },
  ]

  const handleTemplateSelect = (template: GoalTemplate) => {
    setSelectedTemplate(template)
    setGoalData(prev => ({
      ...prev,
      name: template.name,
      targetAmount: template.suggestedAmount.toString(),
      targetDate: new Date(Date.now() + template.suggestedTimeframe * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: template.description,
    }))
    setCurrentStep(2)
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type and size
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, or WebP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size must be less than 5MB')
      return
    }

    setIsUploading(true)
    
    try {
      // Simulate file upload - in real app, upload to cloud storage
      const reader = new FileReader()
      reader.onload = (e) => {
        const photo: GoalPhoto = {
          id: Date.now().toString(),
          goalId: selectedTemplate?.id || 'custom',
          photoUrl: e.target?.result as string,
          thumbnailUrl: e.target?.result as string,
          uploadedAt: new Date(),
          fileSize: file.size,
          mimeType: file.type,
        }
        setUploadedPhoto(photo)
        setGoalData(prev => ({ ...prev, photoUrl: photo.photoUrl }))
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading photo:', error)
      setIsUploading(false)
    }
  }

  const removePhoto = () => {
    setUploadedPhoto(null)
    setGoalData(prev => ({ ...prev, photoUrl: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = () => {
    const goal: Partial<SavingsGoal> = {
      ...goalData,
      targetAmount: parseFloat(goalData.targetAmount),
      targetDate: new Date(goalData.targetDate),
      category: selectedTemplate?.id || 'custom',
      currentAmount: 0,
      isActive: true,
      framingType: goalData.framingType,
      photoUrl: uploadedPhoto?.photoUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (onGoalCreated) {
      onGoalCreated(goal)
    }

    console.log('Creating goal:', goal)
    setShowWizard(false)
    setCurrentStep(1)
    setSelectedTemplate(null)
    setGoalData({
      name: '',
      targetAmount: '',
      targetDate: '',
      description: '',
      priority: 'medium',
      framingType: 'achievement',
      photoUrl: '',
    })
    setUploadedPhoto(null)
  }

  const selectedTemplateData = goalTemplates.find(t => t.id === selectedTemplate?.id)

  return (
    <div className="space-y-6">
      <Button
        onClick={() => setShowWizard(true)}
        className="w-full sm:w-auto"
        size="lg"
      >
        <PlusIcon className="w-5 h-5 mr-2" />
        {t('goals:actions.createGoal', { defaultValue: 'Create New Goal' })}
      </Button>

      <AnimatePresence>
        {showWizard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowWizard(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentStep === 1 
                      ? t('goals:wizard.step1.title', { defaultValue: 'Choose Your Goal' })
                      : t('goals:wizard.step2.title', { defaultValue: 'Customize Your Goal' })
                    }
                  </h2>
                  <button
                    onClick={() => setShowWizard(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {currentStep === 1 && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {goalTemplates.map((template) => (
                      <motion.div
                        key={template.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="cursor-pointer"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <Card className="h-full hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3 mb-3">
                              <template.icon className="w-8 h-8 text-primary-trust-blue" />
                              <h3 className="font-semibold text-gray-900">{template.name}</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                            <div className="text-sm text-gray-500">
                              <p><strong>{formatCurrency(template.suggestedAmount)}</strong> • {template.suggestedTimeframe} months</p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {currentStep === 2 && selectedTemplate && (
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="space-y-6"
                  >
                    {/* Framing Type Selection */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        {t('goals:wizard.framing.title', { defaultValue: 'How do you want to think about this goal?' })}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            goalData.framingType === 'achievement'
                              ? 'border-primary-trust-blue bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setGoalData(prev => ({ ...prev, framingType: 'achievement' }))}
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            <SparklesIcon className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-gray-900">
                              {t('goals:wizard.framing.achievement', { defaultValue: 'Achievement Focus' })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{selectedTemplate.achievementFrame}</p>
                        </div>
                        
                        <div
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            goalData.framingType === 'loss-avoidance'
                              ? 'border-primary-trust-blue bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setGoalData(prev => ({ ...prev, framingType: 'loss-avoidance' }))}
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                            <span className="font-medium text-gray-900">
                              {t('goals:wizard.framing.lossAvoidance', { defaultValue: 'Avoid Loss' })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{selectedTemplate.lossAvoidanceFrame}</p>
                        </div>
                      </div>
                      
                      {/* Risk Awareness */}
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">
                            {t('goals:wizard.riskAwareness.title', { defaultValue: 'Did you know?' })}
                          </span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">{selectedTemplate.riskAwareness}</p>
                      </div>
                    </div>

                    {/* Photo Upload */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">
                        {t('goals:wizard.photo.title', { defaultValue: 'Add a Personal Touch (Optional)' })}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t('goals:wizard.photo.description', { defaultValue: 'Upload a photo that represents your goal. This creates an emotional connection and can help motivate you.' })}
                      </p>
                      
                      <div className="flex items-center space-x-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        
                        {!uploadedPhoto ? (
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            disabled={isUploading}
                          >
                            <PhotoIcon className="w-4 h-4 mr-2" />
                            {isUploading 
                              ? t('goals:wizard.photo.uploading', { defaultValue: 'Uploading...' })
                              : t('goals:wizard.photo.select', { defaultValue: 'Select Photo' })
                            }
                          </Button>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <img
                              src={uploadedPhoto.thumbnailUrl}
                              alt="Goal photo"
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <Button
                              onClick={removePhoto}
                              variant="outline"
                              size="sm"
                            >
                              <XMarkIcon className="w-4 h-4 mr-2" />
                              {t('goals:wizard.photo.remove', { defaultValue: 'Remove' })}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Goal Details Form */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">
                        {t('goals:wizard.details.title', { defaultValue: 'Goal Details' })}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('goals:wizard.details.name', { defaultValue: 'Goal Name' })}
                          </label>
                          <input
                            type="text"
                            value={goalData.name}
                            onChange={(e) => setGoalData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('goals:wizard.details.amount', { defaultValue: 'Target Amount' })}
                          </label>
                          <input
                            type="number"
                            value={goalData.targetAmount}
                            onChange={(e) => setGoalData(prev => ({ ...prev, targetAmount: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('goals:wizard.details.date', { defaultValue: 'Target Date' })}
                          </label>
                          <input
                            type="date"
                            value={goalData.targetDate}
                            onChange={(e) => setGoalData(prev => ({ ...prev, targetDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('goals:wizard.details.priority', { defaultValue: 'Priority' })}
                          </label>
                          <select
                            value={goalData.priority}
                            onChange={(e) => setGoalData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
                          >
                            <option value="low">{t('goals:wizard.details.priority.low', { defaultValue: 'Low' })}</option>
                            <option value="medium">{t('goals:wizard.details.priority.medium', { defaultValue: 'Medium' })}</option>
                            <option value="high">{t('goals:wizard.details.priority.high', { defaultValue: 'High' })}</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('goals:wizard.details.description', { defaultValue: 'Description' })}
                        </label>
                        <textarea
                          value={goalData.description}
                          onChange={(e) => setGoalData(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between pt-4">
                      <Button
                        onClick={() => setCurrentStep(1)}
                        variant="outline"
                      >
                        {t('goals:wizard.actions.back', { defaultValue: 'Back' })}
                      </Button>
                      
                      <Button
                        onClick={handleSubmit}
                        disabled={!goalData.name || !goalData.targetAmount || !goalData.targetDate}
                      >
                        {t('goals:wizard.actions.create', { defaultValue: 'Create Goal' })}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
