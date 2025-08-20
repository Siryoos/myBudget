'use client'

import { useState } from 'react'
import { 
  Bars3Icon, 
  BellIcon, 
  MagnifyingGlassIcon,
  UserCircleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { cn, getTimeBasedGreeting } from '@/lib/utils'

interface HeaderProps {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const greeting = getTimeBasedGreeting()

  const userMenuItems = [
    { name: 'Profile', href: '/profile' },
    { name: 'Settings', href: '/settings' },
    { name: 'Help & Support', href: '/support' },
    { name: 'Sign Out', href: '/logout' },
  ]

  return (
    <header className="bg-white shadow-sm border-b border-neutral-gray/10 sticky top-0 z-40">
      <div className="container-responsive">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and mobile menu */}
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md text-neutral-gray hover:bg-neutral-light-gray hover:text-neutral-dark-gray focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
              onClick={onMenuToggle}
              aria-label="Open navigation menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="flex items-center ml-4 lg:ml-0">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-primary-trust-blue">
                  SmartSave
                </h1>
              </div>
              
              {/* Greeting - hidden on mobile */}
              <div className="hidden md:block ml-6">
                <p className="text-sm text-neutral-gray">
                  {greeting}, <span className="font-medium text-neutral-dark-gray">User</span>
                </p>
              </div>
            </div>
          </div>

          {/* Center - Search (hidden on mobile) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-neutral-gray" />
              </div>
              <input
                type="search"
                placeholder="Search transactions, goals, insights..."
                className="block w-full pl-10 pr-3 py-2 border border-neutral-gray/30 rounded-lg bg-neutral-light-gray/50 text-sm placeholder-neutral-gray focus:outline-none focus:ring-2 focus:ring-primary-trust-blue focus:border-primary-trust-blue focus:bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search"
              />
            </div>
          </div>

          {/* Right side - Actions and user menu */}
          <div className="flex items-center space-x-4">
            {/* Search icon for mobile */}
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-neutral-gray hover:bg-neutral-light-gray hover:text-neutral-dark-gray focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>

            {/* Notifications */}
            <button
              type="button"
              className="relative p-2 rounded-md text-neutral-gray hover:bg-neutral-light-gray hover:text-neutral-dark-gray focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
              aria-label="View notifications"
            >
              <BellIcon className="h-6 w-6" />
              {/* Notification badge */}
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-accent-action-orange transform translate-x-1/2 -translate-y-1/2"></span>
            </button>

            {/* User menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-2 p-2 rounded-md text-neutral-gray hover:bg-neutral-light-gray hover:text-neutral-dark-gray focus:outline-none focus:ring-2 focus:ring-primary-trust-blue">
                <UserCircleIcon className="h-6 w-6" />
                <ChevronDownIcon className="hidden sm:block h-4 w-4" />
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    {userMenuItems.map((item) => (
                      <Menu.Item key={item.name}>
                        {({ active }) => (
                          <a
                            href={item.href}
                            className={cn(
                              'block px-4 py-2 text-sm transition-colors',
                              active
                                ? 'bg-neutral-light-gray text-neutral-dark-gray'
                                : 'text-neutral-gray hover:bg-neutral-light-gray hover:text-neutral-dark-gray'
                            )}
                          >
                            {item.name}
                          </a>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  )
}
