'use client';

import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useTranslation } from '@/lib/useTranslation';

interface NotificationSettingsProps {
  channels?: string[]
  frequency?: string[]
  types?: string[]
}

export function NotificationSettings({
  channels = ['email', 'push', 'sms'],
  frequency = ['realtime', 'daily', 'weekly'],
  types = ['savings', 'budget', 'goals', 'insights'],
}: NotificationSettingsProps) {
  const { t } = useTranslation('settings');
  const [settings, setSettings] = useState({
    email: {
      enabled: true,
      savings: true,
      budget: true,
      goals: true,
      insights: false,
    },
    push: {
      enabled: true,
      savings: true,
      budget: false,
      goals: true,
      insights: true,
    },
    sms: {
      enabled: false,
      savings: false,
      budget: false,
      goals: false,
      insights: false,
    },
    frequency: 'daily',
  });

  const handleChannelToggle = (channel: string) => {
    setSettings(prev => {
      const channelSettings = prev[channel as keyof typeof prev] as any;
      return {
        ...prev,
        [channel]: {
          ...channelSettings,
          enabled: !channelSettings.enabled,
        },
      };
    });
  };

  const handleTypeToggle = (channel: string, type: string) => {
    setSettings(prev => {
      const channelSettings = prev[channel as keyof typeof prev] as any;
      return {
        ...prev,
        [channel]: {
          ...channelSettings,
          [type]: !channelSettings[type],
        },
      };
    });
  };

  const getChannelIcon = (channel: string) => {
    const icons = {
      email: EnvelopeIcon,
      push: BellIcon,
      sms: DevicePhoneMobileIcon,
    };
    return icons[channel as keyof typeof icons] || BellIcon;
  };

  const getChannelLabel = (channel: string) =>
    channel === 'email'
      ? t('notifications.channels.email', { defaultValue: 'Email Notifications' })
      : channel === 'push'
      ? t('notifications.channels.push', { defaultValue: 'Push Notifications' })
      : channel === 'sms'
      ? t('notifications.channels.sms', { defaultValue: 'SMS Notifications' })
      : channel;

  const getTypeLabel = (type: string) =>
    type === 'savings'
      ? t('notifications.types.savings', { defaultValue: 'Savings Milestones' })
      : type === 'budget'
      ? t('notifications.types.budget', { defaultValue: 'Budget Alerts' })
      : type === 'goals'
      ? t('notifications.types.goals', { defaultValue: 'Goal Progress' })
      : type === 'insights'
      ? t('notifications.types.insights', { defaultValue: 'Financial Insights' })
      : type;

  const getTypeDescription = (type: string) =>
    type === 'savings'
      ? t('notifications.types.savings_desc', { defaultValue: 'Get notified when you reach savings milestones' })
      : type === 'budget'
      ? t('notifications.types.budget_desc', { defaultValue: 'Alerts when you exceed budget categories' })
      : type === 'goals'
      ? t('notifications.types.goals_desc', { defaultValue: 'Updates on your financial goal progress' })
      : type === 'insights'
      ? t('notifications.types.insights_desc', { defaultValue: 'Personalized financial tips and recommendations' })
      : '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <div className="bg-accent-action-orange/10 rounded-lg p-2 mr-3">
            <BellIcon className="h-6 w-6 text-accent-action-orange" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              {t('notifications.title', { defaultValue: 'Notification Preferences' })}
            </h3>
            <p className="text-sm text-neutral-gray">
              {t('notifications.subtitle', { defaultValue: 'Choose how and when you want to be notified' })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Global Frequency Setting */}
          <div>
            <h4 className="font-medium text-neutral-dark-gray mb-3">
              {t('notifications.frequency.title', { defaultValue: 'Notification Frequency' })}
            </h4>
            <div className="flex bg-neutral-light-gray rounded-lg p-1">
              {frequency.map((freq) => (
                <button
                  key={freq}
                  onClick={() => setSettings(prev => ({ ...prev, frequency: freq }))}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    settings.frequency === freq
                      ? 'bg-white text-primary-trust-blue shadow-sm'
                      : 'text-neutral-gray hover:text-neutral-dark-gray'
                  }`}
                >
                  {freq === 'realtime'
                    ? t('notifications.frequency.realtime', { defaultValue: 'Realtime' })
                    : freq === 'daily'
                    ? t('notifications.frequency.daily', { defaultValue: 'Daily' })
                    : t('notifications.frequency.weekly', { defaultValue: 'Weekly' })}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-gray mt-2">
              {settings.frequency === 'realtime' && t('notifications.frequency.realtime_desc', { defaultValue: 'Receive notifications immediately as events occur' })}
              {settings.frequency === 'daily' && t('notifications.frequency.daily_desc', { defaultValue: 'Receive a daily summary of important updates' })}
              {settings.frequency === 'weekly' && t('notifications.frequency.weekly_desc', { defaultValue: 'Receive a weekly digest of your financial activity' })}
            </p>
          </div>

          {/* Channel Settings */}
          {channels.map((channel) => {
            const IconComponent = getChannelIcon(channel);
            const channelSettings = settings[channel as keyof typeof settings] as any;

            return (
              <div key={channel} className="border border-neutral-gray/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-neutral-light-gray rounded-lg p-2 mr-3">
                      <IconComponent className="h-5 w-5 text-neutral-gray" />
                    </div>
                    <div>
                      <h4 className="font-medium text-neutral-dark-gray">
                        {getChannelLabel(channel)}
                      </h4>
                      <p className="text-sm text-neutral-gray">
                        {channel === 'email' && t('notifications.channels.email_desc', { defaultValue: 'Receive notifications via email' })}
                        {channel === 'push' && t('notifications.channels.push_desc', { defaultValue: 'Browser and mobile push notifications' })}
                        {channel === 'sms' && t('notifications.channels.sms_desc', { defaultValue: 'Text message notifications (charges may apply)' })}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelSettings.enabled}
                      onChange={() => handleChannelToggle(channel)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-gray/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-trust-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-trust-blue"></div>
                  </label>
                </div>

                {/* Notification Types */}
                {channelSettings.enabled && (
                  <div className="space-y-3 ml-12">
                    {types.map((type) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-neutral-dark-gray">
                            {getTypeLabel(type)}
                          </div>
                          <div className="text-xs text-neutral-gray">
                            {getTypeDescription(type)}
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={channelSettings[type]}
                            onChange={() => handleTypeToggle(channel, type)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-neutral-gray/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-trust-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-gray after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-trust-blue"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Quiet Hours */}
          <div className="bg-neutral-light-gray/50 rounded-lg p-4">
            <h4 className="font-medium text-neutral-dark-gray mb-3">
              {t('notifications.quiet.title', { defaultValue: 'Quiet Hours' })}
            </h4>
            <p className="text-sm text-neutral-gray mb-3">
              {t('notifications.quiet.desc', { defaultValue: 'Pause non-urgent notifications during these hours' })}
            </p>

            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                  {t('notifications.quiet.from', { defaultValue: 'From' })}
                </label>
                <input
                  type="time"
                  defaultValue="22:00"
                  className="input-field"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                  {t('notifications.quiet.to', { defaultValue: 'To' })}
                </label>
                <input
                  type="time"
                  defaultValue="08:00"
                  className="input-field"
                />
              </div>
            </div>

            <label className="flex items-center mt-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-neutral-gray/30 text-primary-trust-blue focus:ring-primary-trust-blue mr-2"
              />
              <span className="text-sm text-neutral-gray">
                {t('notifications.quiet.enable', { defaultValue: 'Enable quiet hours' })}
              </span>
            </label>
          </div>

          {/* Test Notifications */}
          <div className="bg-primary-trust-blue/5 rounded-lg p-4 border border-primary-trust-blue/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-primary-trust-blue mb-1">
                  {t('notifications.test.title', { defaultValue: 'Test Your Settings' })}
                </h4>
                <p className="text-sm text-neutral-gray">
                  {t('notifications.test.desc', { defaultValue: 'Send a test notification to verify your preferences' })}
                </p>
              </div>
              <div className="flex space-x-2">
                {channels.filter(channel => {
                  const channelSettings = settings[channel as keyof typeof settings] as any;
                  return channelSettings.enabled;
                }).map((channel) => (
                  <button
                    key={channel}
                    className="px-3 py-1 text-xs bg-primary-trust-blue text-white rounded-md hover:bg-primary-trust-blue-dark transition-colors duration-200"
                  >
                    {t('notifications.test.button', { defaultValue: 'Test' })} {channel.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
