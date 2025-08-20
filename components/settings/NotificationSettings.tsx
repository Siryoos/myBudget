'use client'

import { useState } from 'react'
import { 
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

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
  })

  const handleChannelToggle = (channel: string) => {
    setSettings(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel as keyof typeof prev],
        enabled: !prev[channel as keyof typeof prev].enabled,
      },
    }))
  }

  const handleTypeToggle = (channel: string, type: string) => {
    setSettings(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel as keyof typeof prev],
        [type]: !prev[channel as keyof typeof prev][type as keyof typeof prev[typeof channel as keyof typeof prev]],
      },
    }))
  }

  const getChannelIcon = (channel: string) => {
    const icons = {
      email: EnvelopeIcon,
      push: BellIcon,
      sms: DevicePhoneMobileIcon,
    }
    return icons[channel as keyof typeof icons] || BellIcon
  }

  const getChannelLabel = (channel: string) => {
    const labels = {
      email: 'Email Notifications',
      push: 'Push Notifications',
      sms: 'SMS Notifications',
    }
    return labels[channel as keyof typeof labels] || channel
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      savings: 'Savings Milestones',
      budget: 'Budget Alerts',
      goals: 'Goal Progress',
      insights: 'Financial Insights',
    }
    return labels[type as keyof typeof labels] || type
  }

  const getTypeDescription = (type: string) => {
    const descriptions = {
      savings: 'Get notified when you reach savings milestones',
      budget: 'Alerts when you exceed budget categories',
      goals: 'Updates on your financial goal progress',
      insights: 'Personalized financial tips and recommendations',
    }
    return descriptions[type as keyof typeof descriptions] || ''
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <div className="bg-accent-action-orange/10 rounded-lg p-2 mr-3">
            <BellIcon className="h-6 w-6 text-accent-action-orange" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              Notification Preferences
            </h3>
            <p className="text-sm text-neutral-gray">
              Choose how and when you want to be notified
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Global Frequency Setting */}
          <div>
            <h4 className="font-medium text-neutral-dark-gray mb-3">
              Notification Frequency
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
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-gray mt-2">
              {settings.frequency === 'realtime' && 'Receive notifications immediately as events occur'}
              {settings.frequency === 'daily' && 'Receive a daily summary of important updates'}
              {settings.frequency === 'weekly' && 'Receive a weekly digest of your financial activity'}
            </p>
          </div>

          {/* Channel Settings */}
          {channels.map((channel) => {
            const IconComponent = getChannelIcon(channel)
            const channelSettings = settings[channel as keyof typeof settings] as any
            
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
                        {channel === 'email' && 'Receive notifications via email'}
                        {channel === 'push' && 'Browser and mobile push notifications'}
                        {channel === 'sms' && 'Text message notifications (charges may apply)'}
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
            )
          })}

          {/* Quiet Hours */}
          <div className="bg-neutral-light-gray/50 rounded-lg p-4">
            <h4 className="font-medium text-neutral-dark-gray mb-3">
              Quiet Hours
            </h4>
            <p className="text-sm text-neutral-gray mb-3">
              Pause non-urgent notifications during these hours
            </p>
            
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                  From
                </label>
                <input
                  type="time"
                  defaultValue="22:00"
                  className="input-field"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                  To
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
                Enable quiet hours
              </span>
            </label>
          </div>

          {/* Test Notifications */}
          <div className="bg-primary-trust-blue/5 rounded-lg p-4 border border-primary-trust-blue/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-primary-trust-blue mb-1">
                  Test Your Settings
                </h4>
                <p className="text-sm text-neutral-gray">
                  Send a test notification to verify your preferences
                </p>
              </div>
              <div className="flex space-x-2">
                {channels.filter(channel => settings[channel as keyof typeof settings].enabled).map((channel) => (
                  <button
                    key={channel}
                    className="px-3 py-1 text-xs bg-primary-trust-blue text-white rounded-md hover:bg-primary-trust-blue-dark transition-colors duration-200"
                  >
                    Test {channel.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
