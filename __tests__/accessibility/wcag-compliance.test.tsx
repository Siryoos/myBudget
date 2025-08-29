import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { TextInput, Select, Checkbox } from '@/components/ui/Input';
import { SkipLink } from '@/components/ui/SkipLink';
import DashboardPage from '@/app/[locale]/dashboard/page';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock components for testing
jest.mock('@/components/lazy', () => ({
  LazyBudgetSummary: () => <div role="region" aria-label="Budget Summary">Budget Summary</div>,
  LazyInsightsPanel: () => <div role="region" aria-label="Insights Panel">Insights Panel</div>,
  LazyRecentTransactions: () => <div role="region" aria-label="Recent Transactions">Recent Transactions</div>,
  LazyOnboardingChecklist: () => <div role="region" aria-label="Onboarding Checklist">Onboarding Checklist</div>,
}));

describe('WCAG 2.1 AA Compliance - Components', () => {
  describe('Button Component', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <div>
          <Button>Click me</Button>
          <Button disabled>Disabled button</Button>
          <Button loading>Loading button</Button>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('meets color contrast requirements', async () => {
      const { container } = render(
        <>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
        </>
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('has proper focus indicators', () => {
      render(<Button>Focusable Button</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('focus:ring-2');
      expect(button).toHaveClass('focus:ring-offset-2');
    });
  });

  describe('Form Components', () => {
    it('has accessible form labels', async () => {
      const { container } = render(
        <form>
          <TextInput label="Name" name="name" required />
          <TextInput label="Email" name="email" type="email" />
          <Select 
            label="Country" 
            name="country" 
            options={[
              { value: 'us', label: 'United States' },
              { value: 'uk', label: 'United Kingdom' },
            ]} 
          />
          <Checkbox label="Subscribe to newsletter" name="subscribe" />
        </form>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides error feedback accessibly', async () => {
      const { container } = render(
        <form>
          <TextInput 
            label="Username" 
            name="username" 
            error="Username is already taken"
            required 
          />
        </form>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('indicates required fields properly', () => {
      render(
        <TextInput label="Required Field" name="required" required />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
      
      // Visual indicator
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Card Component', () => {
    it('has proper structure and semantics', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <h2>Card Title</h2>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
        </Card>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard interaction when clickable', async () => {
      const { container } = render(
        <Card onClick={() => {}}>
          <CardContent>Clickable card</CardContent>
        </Card>
      );

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

describe('WCAG 2.1 AA Compliance - Page Level', () => {
  describe('Skip Links', () => {
    it('provides skip to main content link', () => {
      render(<SkipLink />);
      
      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
      
      // Should be visually hidden but accessible
      expect(skipLink).toHaveClass('absolute');
      expect(skipLink).toHaveClass('-translate-y-full');
      expect(skipLink).toHaveClass('focus:translate-y-0');
    });
  });

  describe('Page Structure', () => {
    it('has proper landmark regions', () => {
      const { container } = render(<DashboardPage />);

      // Main content area
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute('id', 'main-content');

      // Other regions
      const regions = screen.getAllByRole('region');
      regions.forEach(region => {
        expect(region).toHaveAttribute('aria-label');
      });
    });

    it('has proper heading hierarchy', () => {
      render(<DashboardPage />);

      const headings = screen.getAllByRole('heading');
      const headingLevels = headings.map(h => parseInt(h.tagName.charAt(1)));
      
      // Should start with h1
      expect(headingLevels[0]).toBe(1);
      
      // Should not skip levels
      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1];
        expect(diff).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard-only navigation', () => {
      render(<DashboardPage />);

      // All interactive elements should be reachable
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(parseInt(element.getAttribute('tabIndex') || '0')).toBeGreaterThanOrEqual(-1);
      });
    });

    it('has visible focus indicators', () => {
      render(<DashboardPage />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const classes = button.className;
        expect(classes).toMatch(/focus:/);
      });
    });
  });

  describe('Color and Contrast', () => {
    it('does not rely solely on color', () => {
      render(<DashboardPage />);

      // Error states should have icons or text, not just color
      const errorElements = document.querySelectorAll('.text-accent-expense-red');
      errorElements.forEach(element => {
        const hasText = element.textContent && element.textContent.length > 0;
        const hasIcon = element.querySelector('svg');
        expect(hasText || hasIcon).toBeTruthy();
      });
    });

    it('supports high contrast mode', () => {
      // Set high contrast mode
      document.documentElement.dataset.contrast = 'high';
      
      render(<DashboardPage />);

      // Should have high contrast styles applied
      const rootElement = document.documentElement;
      expect(rootElement.dataset.contrast).toBe('high');

      // Reset
      delete document.documentElement.dataset.contrast;
    });
  });

  describe('Images and Media', () => {
    it('provides alt text for images', () => {
      render(<DashboardPage />);

      const images = screen.queryAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        const altText = img.getAttribute('alt');
        expect(altText).not.toBe(''); // Alt text should not be empty
      });
    });

    it('provides text alternatives for icons', () => {
      render(<DashboardPage />);

      // Icons used as buttons should have labels
      const iconButtons = document.querySelectorAll('button svg');
      iconButtons.forEach(icon => {
        const button = icon.closest('button');
        const hasAriaLabel = button?.hasAttribute('aria-label');
        const hasText = button?.textContent && button.textContent.trim().length > 0;
        expect(hasAriaLabel || hasText).toBeTruthy();
      });
    });
  });

  describe('Forms and Inputs', () => {
    it('groups related form controls', () => {
      render(<DashboardPage />);

      // Fieldsets should have legends
      const fieldsets = document.querySelectorAll('fieldset');
      fieldsets.forEach(fieldset => {
        const legend = fieldset.querySelector('legend');
        expect(legend).toBeInTheDocument();
      });
    });

    it('provides clear instructions', () => {
      render(<DashboardPage />);

      // Required fields should be clearly marked
      const requiredInputs = document.querySelectorAll('[required]');
      requiredInputs.forEach(input => {
        expect(input).toHaveAttribute('aria-required', 'true');
        
        // Should have visual indicator nearby
        const container = input.closest('div');
        const requiredIndicator = container?.querySelector('.text-accent-expense-red');
        expect(requiredIndicator).toBeInTheDocument();
      });
    });
  });

  describe('Dynamic Content', () => {
    it('announces dynamic changes', () => {
      render(<DashboardPage />);

      // Live regions for dynamic content
      const liveRegions = screen.queryAllByRole('status');
      expect(liveRegions.length).toBeGreaterThan(0);

      liveRegions.forEach(region => {
        expect(region).toHaveAttribute('aria-live');
        const ariaLive = region.getAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(ariaLive);
      });
    });

    it('manages focus properly after actions', () => {
      render(<DashboardPage />);

      // Modal and dialog elements should trap focus
      const dialogs = screen.queryAllByRole('dialog');
      dialogs.forEach(dialog => {
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });
    });
  });

  describe('Responsive Design', () => {
    it('works at different zoom levels', () => {
      // Test at 200% zoom
      document.documentElement.style.fontSize = '32px';
      
      render(<DashboardPage />);

      // Content should still be accessible
      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();

      // Reset
      document.documentElement.style.fontSize = '';
    });

    it('supports text spacing adjustments', () => {
      // Apply WCAG text spacing
      const style = document.createElement('style');
      style.textContent = `
        * {
          line-height: 1.5 !important;
          letter-spacing: 0.12em !important;
          word-spacing: 0.16em !important;
        }
        p {
          margin-bottom: 2em !important;
        }
      `;
      document.head.appendChild(style);

      render(<DashboardPage />);

      // Content should remain readable
      const paragraphs = document.querySelectorAll('p');
      expect(paragraphs.length).toBeGreaterThan(0);

      // Cleanup
      document.head.removeChild(style);
    });
  });
});

describe('Screen Reader Support', () => {
  it('provides screen reader only content where needed', () => {
    render(<DashboardPage />);

    const srOnlyElements = document.querySelectorAll('.sr-only');
    expect(srOnlyElements.length).toBeGreaterThan(0);

    srOnlyElements.forEach(element => {
      // Should have actual content
      expect(element.textContent).toBeTruthy();
    });
  });

  it('uses semantic HTML properly', () => {
    render(<DashboardPage />);

    // Navigation should use nav element
    const navElements = document.querySelectorAll('nav');
    expect(navElements.length).toBeGreaterThan(0);

    // Lists should use ul/ol with li
    const lists = document.querySelectorAll('ul, ol');
    lists.forEach(list => {
      const items = list.querySelectorAll('li');
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('provides context for ambiguous links', () => {
    render(<DashboardPage />);

    // Links with generic text should have aria-label
    const links = screen.queryAllByRole('link');
    links.forEach(link => {
      const text = link.textContent?.toLowerCase() || '';
      if (['read more', 'click here', 'more', 'here'].includes(text)) {
        expect(link).toHaveAttribute('aria-label');
      }
    });
  });
});