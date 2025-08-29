'use client';

import {
  ShieldCheckIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useChangePassword } from '@/hooks/useChangePassword';
import { useTranslation } from '@/lib/useTranslation';

interface SecurityPanelProps {
  twoFactor?: boolean
  biometric?: boolean
  sessionManagement?: boolean
}

export function SecurityPanel({
  twoFactor = true,
  biometric = true,
  sessionManagement = true,
}: SecurityPanelProps) {
  const { t } = useTranslation('settings');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password change hook
  const { changePassword, isLoading, error, success, resetState } = useChangePassword();

  // Mock active sessions
  const activeSessions = [
    {
      id: '1',
      device: 'MacBook Pro',
      location: 'New York, NY',
      lastActive: '2 minutes ago',
      current: true,
      browser: 'Chrome 119.0',
    },
    {
      id: '2',
      device: 'iPhone 15 Pro',
      location: 'New York, NY',
      lastActive: '1 hour ago',
      current: false,
      browser: 'Safari Mobile',
    },
    {
      id: '3',
      device: 'Windows PC',
      location: 'Brooklyn, NY',
      lastActive: '3 days ago',
      current: false,
      browser: 'Edge 118.0',
    },
  ];

  // Handle password change form submission
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any existing errors
    resetState();

    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return;
    }

    if (newPassword !== confirmPassword) {
      // This validation is handled by the form, but we can add a custom error here if needed
      return;
    }

    if (newPassword.length < 8) {
      return;
    }

    await changePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
  };

  // Reset form after successful password change
  const handleSuccessReset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    resetState();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <div className="bg-accent-warning-red/10 rounded-lg p-2 mr-3">
            <ShieldCheckIcon className="h-6 w-6 text-accent-warning-red" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              {t('security.title', { defaultValue: 'Security & Privacy' })}
            </h3>
            <p className="text-sm text-neutral-gray">
              {t('security.subtitle', { defaultValue: 'Secure your account and protect your data' })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Password Change Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <KeyIcon className="h-5 w-5 text-neutral-gray mr-2" />
              <h4 className="font-medium text-neutral-dark-gray">
                {t('security.passwordChange.title', { defaultValue: 'Change Password' })}
              </h4>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                {t('security.passwordChange.currentPassword', { defaultValue: 'Current Password' })}
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-gray/20 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-gray hover:text-neutral-dark-gray"
                >
                  {showCurrentPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                {t('security.passwordChange.newPassword', { defaultValue: 'New Password' })}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-gray/20 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-gray hover:text-neutral-dark-gray"
                >
                  {showNewPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                {t('security.passwordChange.confirmPassword', { defaultValue: 'Confirm New Password' })}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-gray/20 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                placeholder="Confirm new password"
              />
            </div>

            <p className="text-xs text-neutral-gray">
              {t('security.passwordChange.requirements', { defaultValue: 'Password must be at least 8 characters long' })}
            </p>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Updating...' : t('security.passwordChange.submit', { defaultValue: 'Update Password' })}
            </Button>

            {error && (
              <p className="text-sm text-accent-warning-red">
                {t('security.passwordChange.error', { defaultValue: 'Failed to update password. Please try again.' })}
              </p>
            )}

            {success && (
              <p className="text-sm text-secondary-growth-green">
                {t('security.passwordChange.success', { defaultValue: 'Password updated successfully!' })}
              </p>
            )}
          </form>
        </div>

        {/* Two-Factor Authentication */}
        {twoFactor && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DevicePhoneMobileIcon className="h-5 w-5 text-neutral-gray mr-2" />
                <div>
                  <h4 className="font-medium text-neutral-dark-gray">
                    {t('security.twoFactorAuth.title', { defaultValue: 'Two-Factor Authentication' })}
                  </h4>
                  <p className="text-sm text-neutral-gray">
                    {t('security.twoFactorAuth.subtitle', { defaultValue: 'Add an extra layer of security to your account' })}
                  </p>
                </div>
              </div>
              <Button
                variant={twoFactorEnabled ? 'outline' : 'primary'}
                size="sm"
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              >
                {twoFactorEnabled
                  ? t('security.twoFactorAuth.disable', { defaultValue: 'Disable 2FA' })
                  : t('security.twoFactorAuth.enable', { defaultValue: 'Enable 2FA' })
                }
              </Button>
            </div>
            <p className="text-sm text-neutral-gray">
              {twoFactorEnabled
                ? t('security.twoFactorAuth.enabled', { defaultValue: 'Two-factor authentication is enabled' })
                : t('security.twoFactorAuth.disabled', { defaultValue: 'Two-factor authentication is disabled' })
              }
            </p>
          </div>
        )}

        {/* Biometric Authentication */}
        {biometric && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ComputerDesktopIcon className="h-5 w-5 text-neutral-gray mr-2" />
                <div>
                  <h4 className="font-medium text-neutral-dark-gray">
                    {t('security.biometric.title', { defaultValue: 'Biometric Authentication' })}
                  </h4>
                  <p className="text-sm text-neutral-gray">
                    {t('security.biometric.subtitle', { defaultValue: 'Use fingerprint or face recognition for quick access' })}
                  </p>
                </div>
              </div>
              <Button
                variant={biometricEnabled ? 'outline' : 'primary'}
                size="sm"
                onClick={() => setBiometricEnabled(!biometricEnabled)}
              >
                {biometricEnabled
                  ? t('security.biometric.disable', { defaultValue: 'Disable Biometric' })
                  : t('security.biometric.enable', { defaultValue: 'Enable Biometric' })
                }
              </Button>
            </div>
            <p className="text-sm text-neutral-gray">
              {biometricEnabled
                ? t('security.biometric.enabled', { defaultValue: 'Biometric authentication is enabled' })
                : t('security.biometric.disabled', { defaultValue: 'Biometric authentication is disabled' })
              }
            </p>
          </div>
        )}

        {/* Active Sessions */}
        {sessionManagement && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ComputerDesktopIcon className="h-5 w-5 text-neutral-gray mr-2" />
                <div>
                  <h4 className="font-medium text-neutral-dark-gray">
                    {t('security.sessions.title', { defaultValue: 'Active Sessions' })}
                  </h4>
                  <p className="text-sm text-neutral-gray">
                    {t('security.sessions.subtitle', { defaultValue: 'Manage your active login sessions across devices' })}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                {t('security.sessions.terminateAll', { defaultValue: 'Terminate All Other Sessions' })}
              </Button>
            </div>

            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    session.current
                      ? 'bg-primary-trust-blue/5 border-primary-trust-blue/20'
                      : 'bg-neutral-light-gray/50 border-neutral-gray/20'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        session.current ? 'bg-primary-trust-blue' : 'bg-neutral-gray'
                      }`} />
                      <span className="text-sm font-medium text-neutral-dark-gray">
                        {session.device}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-gray">
                      {session.location} • {session.browser}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-neutral-gray">
                      {session.current
                        ? t('security.sessions.current', { defaultValue: 'Current Session' })
                        : session.lastActive
                      }
                    </span>
                    {!session.current && (
                      <Button variant="outline" size="sm">
                        {t('security.sessions.terminate', { defaultValue: 'Terminate Session' })}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
