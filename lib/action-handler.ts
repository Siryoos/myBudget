import { apiClient } from './api-client';
import type { InsightAction } from '@/types';

export interface ActionContext {
  userId?: string;
  goalId?: string;
  budgetId?: string;
  transactionId?: string;
  data?: any;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: any;
  redirectUrl?: string;
}

export type ActionHandler = (action: InsightAction, context: ActionContext) => Promise<ActionResult>;

// Registry of custom action handlers
const actionHandlers: Record<string, ActionHandler> = {
  // Goal-related actions
  'create_goal': async (action, context) => {
    return {
      success: true,
      redirectUrl: '/goals/new'
    };
  },
  
  'quick_save': async (action, context) => {
    if (!context.goalId || !context.data?.amount) {
      return {
        success: false,
        message: 'Goal ID and amount are required'
      };
    }
    
    try {
      const response = await apiClient.addGoalContribution(context.goalId, context.data.amount);
      return {
        success: response.success,
        message: response.success ? 'Contribution added successfully' : response.error,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to add contribution'
      };
    }
  },
  
  // Budget-related actions
  'set_budget': async (action, context) => {
    if (!context.data?.category || !context.data?.amount) {
      return {
        success: false,
        message: 'Category and amount are required'
      };
    }
    
    return {
      success: true,
      redirectUrl: `/budget?category=${context.data.category}&amount=${context.data.amount}`
    };
  },
  
  'track_coffee': async (action, context) => {
    // Create a transaction for coffee spending
    try {
      const response = await apiClient.createTransaction({
        type: 'expense',
        amount: context.data?.amount || 5,
        category: 'food',
        description: 'Coffee',
        date: new Date().toISOString(),
        tags: ['coffee', 'daily-expense']
      });
      
      return {
        success: response.success,
        message: response.success ? 'Coffee expense tracked' : response.error,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to track expense'
      };
    }
  },
  
  // Analytics actions
  'view_spending_analysis': async (action, context) => {
    const category = context.data?.category || 'all';
    return {
      success: true,
      redirectUrl: `/analytics?category=${category}&view=spending`
    };
  },
  
  'compare_budgets': async (action, context) => {
    return {
      success: true,
      redirectUrl: '/budget/compare'
    };
  },
  
  // Notification actions
  'dismiss_insight': async (action, context) => {
    if (!context.data?.insightId) {
      return {
        success: false,
        message: 'Insight ID is required'
      };
    }
    
    try {
      await apiClient.markNotificationRead(context.data.insightId);
      return {
        success: true,
        message: 'Insight dismissed'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to dismiss insight'
      };
    }
  },
  
  // Achievement actions
  'claim_reward': async (action, context) => {
    if (!context.data?.achievementId) {
      return {
        success: false,
        message: 'Achievement ID is required'
      };
    }
    
    // In a real implementation, this would claim the reward on the backend
    return {
      success: true,
      message: 'Reward claimed!',
      data: {
        points: 100,
        badge: 'saver-pro'
      }
    };
  },
  
  // Settings actions
  'enable_notifications': async (action, context) => {
    try {
      const response = await apiClient.updateSettings({
        notifications: {
          budgetAlerts: true,
          goalReminders: true,
          achievementUnlocks: true
        }
      });
      
      return {
        success: response.success,
        message: response.success ? 'Notifications enabled' : response.error
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update settings'
      };
    }
  },
  
  // Automation actions
  'setup_auto_save': async (action, context) => {
    return {
      success: true,
      redirectUrl: '/goals/automation'
    };
  }
};

export class ActionHandlerService {
  /**
   * Execute a custom action
   */
  async executeAction(action: InsightAction, context: ActionContext = {}): Promise<ActionResult> {
    // Handle standard navigation actions
    if (action.type === 'navigate') {
      return {
        success: true,
        redirectUrl: action.target
      };
    }
    
    // Handle external links
    if (action.type === 'external') {
      if (typeof window !== 'undefined') {
        window.open(action.target, '_blank', 'noopener,noreferrer');
      }
      return {
        success: true,
        message: 'Opened external link'
      };
    }
    
    // Handle custom execute actions
    if (action.type === 'execute') {
      const handler = actionHandlers[action.target];
      
      if (!handler) {
        console.warn(`No handler found for action: ${action.target}`);
        return {
          success: false,
          message: `Unknown action: ${action.target}`
        };
      }
      
      try {
        return await handler(action, context);
      } catch (error) {
        console.error(`Error executing action ${action.target}:`, error);
        return {
          success: false,
          message: 'Action failed'
        };
      }
    }
    
    return {
      success: false,
      message: 'Invalid action type'
    };
  }
  
  /**
   * Register a custom action handler
   */
  registerHandler(actionId: string, handler: ActionHandler): void {
    actionHandlers[actionId] = handler;
  }
  
  /**
   * Check if an action handler exists
   */
  hasHandler(actionId: string): boolean {
    return actionId in actionHandlers;
  }
  
  /**
   * Get all registered action IDs
   */
  getRegisteredActions(): string[] {
    return Object.keys(actionHandlers);
  }
}

// Export singleton instance
export const actionHandler = new ActionHandlerService();
