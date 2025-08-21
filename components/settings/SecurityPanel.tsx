'use client'

import { useState } from 'react'
import { 
  ShieldCheckIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useChangePassword } from '@/hooks/useChangePassword'

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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(true)
  
  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Password change hook
  const { changePassword, isLoading, error, success, resetState } = useChangePassword()

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
  ]

  // Handle password change form submission
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear any existing errors
    resetState()
    
    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return
    }
    
    if (newPassword !== confirmPassword) {
      // This validation is handled by the form, but we can add a custom error here if needed
      return
    }
    
    if (newPassword.length < 8) {
      return
    }
    
    await changePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    })
  }

  // Reset form after successful password change
  const handleSuccessReset = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    resetState()
  }

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <div className="bg-primary-trust-blue/10 rounded-lg p-2 mr-3">
              <KeyIcon className="h-6 w-6 text-primary-trust-blue" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-dark-gray">
                Change Password
              </h3>
              <p className="text-sm text-neutral-gray">
                Update your password to keep your account secure
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Error and Success Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-green-600">{success}</p>
                  <button
                    type="button"
                    onClick={handleSuccessReset}
                    className="text-green-500 hover:text-green-700 text-sm font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-gray hover:text-neutral-dark-gray"
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className={`input-field pr-10 ${
                    newPassword && newPassword.length < 8 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : ''
                  }`}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-gray hover:text-neutral-dark-gray"
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {newPassword && newPassword.length < 8 && (
                <p className="text-sm text-red-600 mt-1">Password must be at least 8 characters long</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                className={`input-field ${
                  confirmPassword && newPassword !== confirmPassword 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : ''
                }`}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              variant="primary" 
              size="sm"
              disabled={
                isLoading || 
                !currentPassword || 
                !newPassword || 
                !confirmPassword || 
                newPassword.length < 8 || 
                newPassword !== confirmPassword
              }
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      {twoFactor && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-secondary-growth-green/10 rounded-lg p-2 mr-3">
                  <ShieldCheckIcon className="h-6 w-6 text-secondary-growth-green" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-dark-gray">
                    Two-Factor Authentication
                  </h3>
                  <p className="text-sm text-neutral-gray">
                    Add an extra layer of security to your account
                  </p>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-gray/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-secondary-growth-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-growth-green"></div>
              </label>
            </div>
          </CardHeader>

          <CardContent>
            {twoFactorEnabled ? (
              <div className="space-y-4">
                <div className="bg-secondary-growth-green/5 rounded-lg p-4 border border-secondary-growth-green/20">
                  <div className="flex items-center mb-2">
                    <ShieldCheckIcon className="h-5 w-5 text-secondary-growth-green mr-2" />
                    <span className="font-medium text-secondary-growth-green">
                      Two-factor authentication is enabled
                    </span>
                  </div>
                  <p className="text-sm text-neutral-gray">
                    Your account is protected with two-factor authentication using your phone.
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <Button variant="outline" size="sm">
                    View Recovery Codes
                  </Button>
                  <Button variant="ghost" size="sm">
                    Disable 2FA
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-neutral-gray">
                  Enable two-factor authentication to secure your account with your phone or authenticator app.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-neutral-gray/20 rounded-lg p-4 hover:bg-neutral-light-gray/30 cursor-pointer transition-colors">
                    <div className="flex items-center mb-2">
                      <DevicePhoneMobileIcon className="h-5 w-5 text-primary-trust-blue mr-2" />
                      <span className="font-medium text-neutral-dark-gray">SMS</span>
                    </div>
                    <p className="text-sm text-neutral-gray">
                      Receive codes via text message
                    </p>
                  </div>
                  
                  <div className="border border-neutral-gray/20 rounded-lg p-4 hover:bg-neutral-light-gray/30 cursor-pointer transition-colors">
                    <div className="flex items-center mb-2">
                      <ShieldCheckIcon className="h-5 w-5 text-primary-trust-blue mr-2" />
                      <span className="font-medium text-neutral-dark-gray">Authenticator App</span>
                    </div>
                    <p className="text-sm text-neutral-gray">
                      Use Google Authenticator or similar
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Biometric Authentication */}
      {biometric && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-accent-action-orange/10 rounded-lg p-2 mr-3">
                  <DevicePhoneMobileIcon className="h-6 w-6 text-accent-action-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-dark-gray">
                    Biometric Authentication
                  </h3>
                  <p className="text-sm text-neutral-gray">
                    Use fingerprint or face recognition for quick access
                  </p>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={biometricEnabled}
                  onChange={(e) => setBiometricEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-gray/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-action-orange/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-action-orange"></div>
              </label>
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-sm text-neutral-gray">
              {biometricEnabled
                ? 'Biometric authentication is enabled for supported devices.'
                : 'Enable biometric authentication for faster and more secure login.'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Management */}
      {sessionManagement && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-neutral-gray/10 rounded-lg p-2 mr-3">
                  <ComputerDesktopIcon className="h-6 w-6 text-neutral-gray" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-dark-gray">
                    Active Sessions
                  </h3>
                  <p className="text-sm text-neutral-gray">
                    Manage devices that have access to your account
                  </p>
                </div>
              </div>
              
              <Button variant="outline" size="sm">
                Sign Out All
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border border-neutral-gray/20 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="bg-neutral-light-gray rounded-lg p-2 mr-3">
                      {session.device.includes('iPhone') ? (
                        <DevicePhoneMobileIcon className="h-5 w-5 text-neutral-gray" />
                      ) : (
                        <ComputerDesktopIcon className="h-5 w-5 text-neutral-gray" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium text-neutral-dark-gray mr-2">
                          {session.device}
                        </span>
                        {session.current && (
                          <span className="text-xs px-2 py-1 bg-secondary-growth-green/10 text-secondary-growth-green rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-neutral-gray">
                        {session.browser} • {session.location} • {session.lastActive}
                      </div>
                    </div>
                  </div>
                  
                  {!session.current && (
                    <Button variant="ghost" size="sm">
                      Sign Out
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
