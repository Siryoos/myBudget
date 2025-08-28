'use client';

import {
  LightBulbIcon,
  HeartIcon,
  XMarkIcon,
  BookmarkIcon,
  ShareIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

interface FinancialTip {
  id: string
  title: string
  content: string
  category: 'saving' | 'budgeting' | 'investing' | 'debt' | 'general'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  readTime: string
  isPersonalized: boolean
  likes: number
  isLiked: boolean
  isBookmarked: boolean
  createdAt: Date
}

interface TipsFeedProps {
  personalized?: boolean
  dailyTips?: boolean
  contextual?: boolean
}

export function TipsFeed({
  personalized = true,
  dailyTips = true,
  contextual = true,
}: TipsFeedProps) {
  const [tips, setTips] = useState<FinancialTip[]>([
    {
      id: '1',
      title: 'The 24-Hour Rule for Big Purchases',
      content: 'Before making any purchase over $100, wait 24 hours. This simple rule can prevent impulse buying and help you make more thoughtful financial decisions. Often, you\'ll find that the desire to buy fades after some time.',
      category: 'budgeting',
      difficulty: 'beginner',
      readTime: '2 min',
      isPersonalized: true,
      likes: 127,
      isLiked: false,
      isBookmarked: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: '2',
      title: 'Automate Your Savings to Build Wealth',
      content: 'Set up automatic transfers to your savings account right after payday. Even $50 per week adds up to $2,600 per year! Automation removes the temptation to spend that money elsewhere and makes saving effortless.',
      category: 'saving',
      difficulty: 'beginner',
      readTime: '3 min',
      isPersonalized: true,
      likes: 89,
      isLiked: true,
      isBookmarked: true,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      id: '3',
      title: 'Use the Envelope Method for Variable Expenses',
      content: 'For categories like dining out, entertainment, and shopping, try the envelope method. Allocate a specific amount each month and when it\'s gone, it\'s gone. This creates natural spending limits.',
      category: 'budgeting',
      difficulty: 'intermediate',
      readTime: '4 min',
      isPersonalized: false,
      likes: 156,
      isLiked: false,
      isBookmarked: false,
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    {
      id: '4',
      title: 'Track Your Net Worth Monthly',
      content: 'Calculate your net worth (assets minus debts) monthly. This gives you a complete picture of your financial health beyond just checking account balances. Use a simple spreadsheet or app to track the trend.',
      category: 'general',
      difficulty: 'intermediate',
      readTime: '5 min',
      isPersonalized: false,
      likes: 203,
      isLiked: false,
      isBookmarked: false,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
      id: '5',
      title: 'Start Investing with Index Funds',
      content: 'New to investing? Index funds are a great starting point. They offer instant diversification, low fees, and historically solid returns. Start with broad market index funds and gradually learn about other investment options.',
      category: 'investing',
      difficulty: 'beginner',
      readTime: '6 min',
      isPersonalized: true,
      likes: 312,
      isLiked: false,
      isBookmarked: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'personalized' | 'bookmarked'>('all');
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);

  const filteredTips = tips
    .filter(tip => !dismissedTips.includes(tip.id))
    .filter(tip => {
      switch (filter) {
        case 'personalized':
          return tip.isPersonalized;
        case 'bookmarked':
          return tip.isBookmarked;
        default:
          return true;
      }
    });

  const handleLike = (tipId: string) => {
    setTips(prev =>
      prev.map(tip =>
        (tip.id === tipId
          ? {
              ...tip,
              isLiked: !tip.isLiked,
              likes: tip.isLiked ? tip.likes - 1 : tip.likes + 1,
            }
          : tip),
      ),
    );
  };

  const handleBookmark = (tipId: string) => {
    setTips(prev =>
      prev.map(tip =>
        (tip.id === tipId ? { ...tip, isBookmarked: !tip.isBookmarked } : tip),
      ),
    );
  };

  const handleDismiss = (tipId: string) => {
    setDismissedTips(prev => [...prev, tipId]);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      saving: 'bg-secondary-growth-green/10 text-secondary-growth-green',
      budgeting: 'bg-primary-trust-blue/10 text-primary-trust-blue',
      investing: 'bg-accent-action-orange/10 text-accent-action-orange',
      debt: 'bg-accent-warning-red/10 text-accent-warning-red',
      general: 'bg-neutral-gray/10 text-neutral-gray',
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      saving: '💰',
      budgeting: '📊',
      investing: '📈',
      debt: '💳',
      general: '💡',
    };
    return icons[category as keyof typeof icons] || icons.general;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {return 'Just now';}
    if (diffInHours < 24) {return `${diffInHours}h ago`;}

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {return `${diffInDays}d ago`;}

    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-accent-action-orange/10 rounded-lg p-2 mr-3">
              <LightBulbIcon className="h-6 w-6 text-accent-action-orange" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-dark-gray">
                Financial Tips
              </h3>
              <p className="text-sm text-neutral-gray">
                Daily insights to improve your financial health
              </p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex bg-neutral-light-gray rounded-lg p-1 mt-4">
          {(['all', 'personalized', 'bookmarked'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`flex-1 px-3 py-1 text-sm font-medium rounded-md transition-all duration-HTTP_OK ${
                filter === filterType
                  ? 'bg-white text-primary-trust-blue shadow-sm'
                  : 'text-neutral-gray hover:text-neutral-dark-gray'
              }`}
            >
              {filterType === 'all' ? 'All Tips' :
               filterType === 'personalized' ? 'For You' : 'Saved'}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* Daily Tip Highlight */}
        {dailyTips && filter === 'all' && (
          <div className="bg-gradient-to-r from-secondary-growth-green to-secondary-growth-green-light rounded-lg p-4 text-white mb-6">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">☀️</span>
              <h4 className="font-semibold">Tip of the Day</h4>
            </div>
            <p className="text-sm text-secondary-growth-green-light mb-3">
              Review your subscriptions monthly. Cancel unused services to save $20-50+ per month.
            </p>
            <Button variant="outline" size="sm" className="text-white border-white hover:bg-white hover:text-secondary-growth-green">
              Learn More
            </Button>
          </div>
        )}

        {filteredTips.length === 0 ? (
          <div className="text-center py-8">
            <LightBulbIcon className="h-16 w-16 text-neutral-gray mx-auto mb-4" />
            <h4 className="text-lg font-medium text-neutral-dark-gray mb-2">
              No tips found
            </h4>
            <p className="text-neutral-gray">
              {filter === 'bookmarked'
                ? 'Bookmark some tips to see them here!'
                : 'Check back later for new financial insights.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTips.map((tip) => (
              <div
                key={tip.id}
                className="bg-white border border-neutral-gray/20 rounded-lg p-4 hover:shadow-sm transition-shadow duration-HTTP_OK"
              >
                {/* Tip Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center flex-1">
                    <span className="text-xl mr-3">
                      {getCategoryIcon(tip.category)}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <h4 className="font-semibold text-neutral-dark-gray mr-2">
                          {tip.title}
                        </h4>
                        {tip.isPersonalized && (
                          <span className="text-xs px-2 py-1 bg-primary-trust-blue/10 text-primary-trust-blue rounded-full">
                            For You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-neutral-gray">
                        <span className={`px-2 py-1 rounded-full font-medium ${getCategoryColor(tip.category)}`}>
                          {tip.category.charAt(0).toUpperCase() + tip.category.slice(1)}
                        </span>
                        <div className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {tip.readTime}
                        </div>
                        <span>{formatTimeAgo(tip.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDismiss(tip.id)}
                    className="p-1 rounded-full hover:bg-neutral-light-gray text-neutral-gray hover:text-neutral-dark-gray transition-colors duration-HTTP_OK"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Tip Content */}
                <p className="text-sm text-neutral-gray mb-4 leading-relaxed">
                  {tip.content}
                </p>

                {/* Tip Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleLike(tip.id)}
                      className={`flex items-center space-x-1 px-2 py-1 rounded-full transition-colors duration-HTTP_OK ${
                        tip.isLiked
                          ? 'bg-accent-warning-red/10 text-accent-warning-red'
                          : 'hover:bg-neutral-light-gray text-neutral-gray hover:text-neutral-dark-gray'
                      }`}
                    >
                      <HeartIcon className={`h-4 w-4 ${tip.isLiked ? 'fill-current' : ''}`} />
                      <span className="text-sm">{tip.likes}</span>
                    </button>

                    <button
                      onClick={() => handleBookmark(tip.id)}
                      className={`p-1 rounded-full transition-colors duration-HTTP_OK ${
                        tip.isBookmarked
                          ? 'bg-primary-trust-blue/10 text-primary-trust-blue'
                          : 'hover:bg-neutral-light-gray text-neutral-gray hover:text-neutral-dark-gray'
                      }`}
                    >
                      <BookmarkIcon className={`h-4 w-4 ${tip.isBookmarked ? 'fill-current' : ''}`} />
                    </button>

                    <button className="p-1 rounded-full hover:bg-neutral-light-gray text-neutral-gray hover:text-neutral-dark-gray transition-colors duration-HTTP_OK">
                      <ShareIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <Button variant="outline" size="sm">
                    Read More
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Weekly Challenge */}
        <div className="mt-6 bg-accent-action-orange/5 rounded-lg p-4 border border-accent-action-orange/20">
          <div className="flex items-center mb-3">
            <span className="text-2xl mr-2">🎯</span>
            <h4 className="font-medium text-accent-action-orange">
              Weekly Challenge
            </h4>
          </div>
          <p className="text-sm text-neutral-gray mb-3">
            Track every expense for 7 days to identify spending patterns and potential savings opportunities.
          </p>
          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-gray">
              2,847 people are taking this challenge
            </div>
            <Button variant="secondary" size="sm">
              Join Challenge
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
