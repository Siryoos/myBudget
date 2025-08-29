'use client';

import {
  AcademicCapIcon,
  BookOpenIcon,
  CheckCircleIcon,
  PlayIcon,
  ClockIcon,
  StarIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTranslation } from '@/lib/useTranslation';

interface EducationModule {
  id: string
  title: string
  description: string
  duration: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  progress: number
  isCompleted: boolean
  lessons: number
  quizzes: number
  icon: string
}

interface EducationHubProps {
  topics?: string[]
  interactiveContent?: boolean
  progressTracking?: boolean
  quizzes?: boolean
}

export function EducationHub({
  topics = ['Budgeting Basics', 'Emergency Funds', 'Debt Management', 'Investment Introduction', 'Credit Score', 'Tax Planning'],
  interactiveContent = true,
  progressTracking = true,
  quizzes = true,
}: EducationHubProps) {
  const { t } = useTranslation('education');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');

  // Mock education modules
  const modules: EducationModule[] = [
    {
      id: '1',
      title: 'Budgeting Basics',
      description: 'Learn the fundamentals of creating and maintaining a budget that works for your lifestyle.',
      duration: '45 min',
      difficulty: 'Beginner',
      progress: 80,
      isCompleted: false,
      lessons: 6,
      quizzes: 2,
      icon: '📊',
    },
    {
      id: '2',
      title: 'Emergency Funds',
      description: 'Understand why emergency funds are crucial and how to build one effectively.',
      duration: '30 min',
      difficulty: 'Beginner',
      progress: 100,
      isCompleted: true,
      lessons: 4,
      quizzes: 1,
      icon: '🛡️',
    },
    {
      id: '3',
      title: 'Debt Management',
      description: 'Strategies for paying off debt efficiently and avoiding common debt traps.',
      duration: '60 min',
      difficulty: 'Intermediate',
      progress: 25,
      isCompleted: false,
      lessons: 8,
      quizzes: 3,
      icon: '💳',
    },
    {
      id: '4',
      title: 'Investment Introduction',
      description: 'Basic investment concepts and how to start building wealth for the future.',
      duration: '90 min',
      difficulty: 'Intermediate',
      progress: 0,
      isCompleted: false,
      lessons: 10,
      quizzes: 4,
      icon: '📈',
    },
    {
      id: '5',
      title: 'Credit Score',
      description: 'Everything you need to know about credit scores and how to improve yours.',
      duration: '40 min',
      difficulty: 'Beginner',
      progress: 100,
      isCompleted: true,
      lessons: 5,
      quizzes: 2,
      icon: '🏆',
    },
    {
      id: '6',
      title: 'Tax Planning',
      description: 'Learn tax-efficient strategies to maximize your savings and minimize tax burden.',
      duration: '75 min',
      difficulty: 'Advanced',
      progress: 0,
      isCompleted: false,
      lessons: 9,
      quizzes: 3,
      icon: '📋',
    },
  ];

  const filteredModules = modules.filter(module => {
    switch (filter) {
      case 'in-progress':
        return module.progress > 0 && !module.isCompleted;
      case 'completed':
        return module.isCompleted;
      default:
        return true;
    }
  });

  const totalProgress = Math.round(
    modules.reduce((sum, module) => sum + module.progress, 0) / modules.length,
  );

  const completedModules = modules.filter(m => m.isCompleted).length;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-secondary-growth-green/10 text-secondary-growth-green';
      case 'Intermediate':
        return 'bg-accent-action-orange/10 text-accent-action-orange';
      case 'Advanced':
        return 'bg-accent-warning-red/10 text-accent-warning-red';
      default:
        return 'bg-neutral-gray/10 text-neutral-gray';
    }
  };

  const ModuleCard = ({ module }: { module: EducationModule }) => (
    <div
      className={`bg-white border rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
        selectedModule === module.id ? 'border-primary-trust-blue shadow-md' : 'border-neutral-gray/20'
      }`}
      onClick={() => setSelectedModule(module.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setSelectedModule(module.id);
        }
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="text-3xl mr-3">{module.icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-dark-gray mb-1">
              {module.title}
            </h3>
            <p className="text-sm text-neutral-gray">
              {module.description}
            </p>
          </div>
        </div>

        {module.isCompleted && (
          <div className="bg-secondary-growth-green/10 rounded-full p-2">
            <CheckCircleIcon className="h-5 w-5 text-secondary-growth-green" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-neutral-gray mb-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-1" />
            {module.duration}
          </div>
          <div className="flex items-center">
            <BookOpenIcon className="h-4 w-4 mr-1" />
            {module.lessons} {t('lessons', { defaultValue: 'lessons' })}
          </div>
          {quizzes && (
            <div className="flex items-center">
              <TrophyIcon className="h-4 w-4 mr-1" />
              {module.quizzes} {t('quizzes', { defaultValue: 'quizzes' })}
            </div>
          )}
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(module.difficulty)}`}>
          {module.difficulty}
        </span>
      </div>

      {progressTracking && (
        <div className="mb-4">
          <ProgressBar
            value={module.progress}
            max={100}
            size="sm"
            color={module.isCompleted ? 'success' : 'primary'}
            showPercentage={true}
            animated={!module.isCompleted}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-gray">
          {module.isCompleted
            ? t('status.completed', { defaultValue: '✅ Completed' })
            : module.progress > 0
              ? t('status.percentComplete', { defaultValue: '{{percent}}% complete', percent: module.progress })
              : t('status.notStarted', { defaultValue: 'Not started' })
          }
        </div>
        <Button
          variant={module.isCompleted ? 'outline' : 'primary'}
          size="sm"
        >
          <PlayIcon className="h-4 w-4 mr-2" />
          {module.isCompleted ? t('actions.review', { defaultValue: 'Review' }) : module.progress > 0 ? t('actions.continue', { defaultValue: 'Continue' }) : t('actions.start', { defaultValue: 'Start' })}
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-primary-trust-blue/10 rounded-lg p-2 mr-3">
              <AcademicCapIcon className="h-6 w-6 text-primary-trust-blue" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-dark-gray">
                {t('modules.title', { defaultValue: 'Learning Modules' })}
              </h3>
              <p className="text-sm text-neutral-gray">
                {t('modules.subtitle', { defaultValue: 'Interactive lessons to boost your financial knowledge' })}
              </p>
            </div>
          </div>

          {/* Filter buttons */}
          <div className="flex bg-neutral-light-gray rounded-lg p-1">
            {(['all', 'in-progress', 'completed'] as const).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                  filter === filterType
                    ? 'bg-white text-primary-trust-blue shadow-sm'
                    : 'text-neutral-gray hover:text-neutral-dark-gray'
                }`}
              >
                {filterType === 'all' ? t('filters.all', { defaultValue: 'All' }) :
                 filterType === 'in-progress' ? t('filters.inProgress', { defaultValue: 'In Progress' }) : t('filters.completed', { defaultValue: 'Completed' })}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Overview */}
        {progressTracking && (
          <div className="bg-gradient-to-r from-primary-trust-blue to-primary-trust-blue-light rounded-lg p-4 text-white mt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">{t('progress.title', { defaultValue: 'Your Learning Progress' })}</h4>
                <p className="text-primary-trust-blue-light text-sm">
                  {t('progress.summary', { defaultValue: '{{completed}} of {{total}} modules completed', completed: completedModules, total: modules.length })}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{totalProgress}%</div>
                <div className="text-sm text-primary-trust-blue-light">{t('progress.overall', { defaultValue: 'Overall' })}</div>
              </div>
            </div>

            <ProgressBar
              value={totalProgress}
              max={100}
              size="md"
              color="success"
              showPercentage={false}
              className="bg-white/20"
            />

            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="text-primary-trust-blue-light">{t('progress.keepLearning', { defaultValue: 'Keep learning!' })}</span>
              <div className="flex items-center">
                <StarIcon className="h-4 w-4 mr-1" />
              <span>{t('progress.level', { defaultValue: 'Level {{level}}', level: Math.floor(totalProgress / 20) + 1 })}</span>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {filteredModules.length === 0 ? (
          <div className="text-center py-8">
            <BookOpenIcon className="h-16 w-16 text-neutral-gray mx-auto mb-4" />
            <h4 className="text-lg font-medium text-neutral-dark-gray mb-2">
              {t('empty.title', { defaultValue: 'No modules found' })}
            </h4>
            <p className="text-neutral-gray">
              {filter === 'completed'
                ? t('empty.completed', { defaultValue: 'Complete some modules to see them here!' })
                : t('empty.start', { defaultValue: 'Start learning to track your progress.' })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredModules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        )}

        {/* Learning Achievements */}
        {completedModules > 0 && (
          <div className="mt-6 bg-secondary-growth-green/5 rounded-lg p-4 border border-secondary-growth-green/20">
            <div className="flex items-center mb-3">
              <TrophyIcon className="h-5 w-5 text-secondary-growth-green mr-2" />
              <h4 className="font-medium text-secondary-growth-green">
                {t('achievements.recent', { defaultValue: 'Recent Achievements' })}
              </h4>
            </div>

            <div className="space-y-2">
              {modules
                .filter(m => m.isCompleted)
                .slice(-3)
                .map(module => (
                  <div key={module.id} className="flex items-center text-sm">
                    <CheckCircleIcon className="h-4 w-4 text-secondary-growth-green mr-2 flex-shrink-0" />
                    <span className="text-neutral-gray">
                      {t('achievements.completed', { defaultValue: 'Completed {{title}}', title: module.title })}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Next Recommended Module */}
        {(() => {
          const nextModule = modules.find(m => !m.isCompleted && m.progress === 0);
          if (!nextModule) {return null;}

          return (
            <div className="mt-6 bg-accent-action-orange/5 rounded-lg p-4 border border-accent-action-orange/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-accent-action-orange mb-1">
                    {t('recommended.title', { defaultValue: '💡 Recommended Next' })}
                  </h4>
                  <p className="text-sm text-neutral-gray">
                    {t('recommended.desc', { defaultValue: 'Start with {{title}} - perfect for your current level', title: nextModule.title })}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedModule(nextModule.id)}
                >
                  {t('recommended.start', { defaultValue: 'Start Learning' })}
                </Button>
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
