import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card, CardHeader, CardContent, CardFooter, CardLoading, CardError } from '@/components/ui/Card';

describe('Card Component', () => {
  it('renders with children', () => {
    render(
      <Card>
        <div>Card content</div>
      </Card>
    );
    
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <Card className="custom-card-class">
        <div>Content</div>
      </Card>
    );
    
    const card = screen.getByText('Content').parentElement;
    expect(card).toHaveClass('custom-card-class');
    expect(card).toHaveClass('bg-white'); // Should still have base classes
  });

  it('supports hover effect', () => {
    render(
      <Card hover>
        <div>Hoverable card</div>
      </Card>
    );
    
    const card = screen.getByText('Hoverable card').parentElement;
    expect(card).toHaveClass('hover:shadow-lg');
  });

  it('can be clickable', () => {
    const handleClick = jest.fn();
    
    render(
      <Card onClick={handleClick}>
        <div>Clickable card</div>
      </Card>
    );
    
    const card = screen.getByText('Clickable card').parentElement;
    expect(card).toHaveClass('cursor-pointer');
    
    fireEvent.click(card!);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('spreads additional props', () => {
    render(
      <Card data-testid="test-card" aria-label="Test card">
        <div>Content</div>
      </Card>
    );
    
    const card = screen.getByTestId('test-card');
    expect(card).toHaveAttribute('aria-label', 'Test card');
  });
});

describe('CardHeader Component', () => {
  it('renders with children', () => {
    render(
      <CardHeader>
        <h2>Card Title</h2>
      </CardHeader>
    );
    
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('applies correct spacing', () => {
    render(
      <Card>
        <CardHeader>
          <h2>Header</h2>
        </CardHeader>
        <CardContent>
          <p>Content</p>
        </CardContent>
      </Card>
    );
    
    const header = screen.getByText('Header').parentElement;
    expect(header).toHaveClass('p-6', 'pb-0');
  });
});

describe('CardContent Component', () => {
  it('renders with children', () => {
    render(
      <CardContent>
        <p>Card body content</p>
      </CardContent>
    );
    
    expect(screen.getByText('Card body content')).toBeInTheDocument();
  });

  it('applies correct padding', () => {
    render(
      <CardContent>
        <p>Content</p>
      </CardContent>
    );
    
    const content = screen.getByText('Content').parentElement;
    expect(content).toHaveClass('p-6');
  });

  it('can remove padding', () => {
    render(
      <CardContent noPadding>
        <p>No padding content</p>
      </CardContent>
    );
    
    const content = screen.getByText('No padding content').parentElement;
    expect(content).not.toHaveClass('p-6');
    expect(content).toHaveClass('p-0');
  });
});

describe('CardFooter Component', () => {
  it('renders with children', () => {
    render(
      <CardFooter>
        <button>Action</button>
      </CardFooter>
    );
    
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('applies correct styling', () => {
    render(
      <CardFooter>
        <div>Footer content</div>
      </CardFooter>
    );
    
    const footer = screen.getByText('Footer content').parentElement;
    expect(footer).toHaveClass('px-6', 'py-4', 'bg-neutral-light-gray/50');
  });
});

describe('CardLoading Component', () => {
  it('renders loading skeleton', () => {
    render(<CardLoading />);
    
    // Check for skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    render(<CardLoading className="custom-loading" />);
    
    const loadingCard = document.querySelector('.custom-loading');
    expect(loadingCard).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<CardLoading />);
    
    const loadingCard = document.querySelector('[role="status"]');
    expect(loadingCard).toBeInTheDocument();
    expect(loadingCard).toHaveAttribute('aria-busy', 'true');
    
    // Should have screen reader text
    const srText = screen.getByText('Loading...');
    expect(srText).toHaveClass('sr-only');
  });
});

describe('CardError Component', () => {
  it('renders error message', () => {
    render(<CardError message="Something went wrong" />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows default error message when none provided', () => {
    render(<CardError />);
    
    expect(screen.getByText('errorLoading')).toBeInTheDocument(); // Translation key
  });

  it('renders retry button when onRetry provided', () => {
    const handleRetry = jest.fn();
    
    render(
      <CardError 
        message="Failed to load" 
        onRetry={handleRetry}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button when onRetry not provided', () => {
    render(<CardError message="Error occurred" />);
    
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('displays error icon', () => {
    render(<CardError message="Error" />);
    
    // Check for XCircleIcon
    const errorIcon = document.querySelector('svg');
    expect(errorIcon).toBeInTheDocument();
    expect(errorIcon?.parentElement).toHaveClass('text-accent-expense-red');
  });

  it('applies custom className', () => {
    render(
      <CardError 
        message="Error" 
        className="custom-error-card"
      />
    );
    
    const errorCard = document.querySelector('.custom-error-card');
    expect(errorCard).toBeInTheDocument();
  });
});

describe('Card Composition', () => {
  it('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <h2>Complete Card</h2>
        </CardHeader>
        <CardContent>
          <p>This is the main content</p>
        </CardContent>
        <CardFooter>
          <button>Footer Action</button>
        </CardFooter>
      </Card>
    );
    
    expect(screen.getByText('Complete Card')).toBeInTheDocument();
    expect(screen.getByText('This is the main content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Footer Action' })).toBeInTheDocument();
  });

  it('maintains proper spacing between sections', () => {
    const { container } = render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    
    const header = screen.getByText('Header').parentElement;
    const content = screen.getByText('Content').parentElement;
    const footer = screen.getByText('Footer').parentElement;
    
    // Header should have bottom padding removed
    expect(header).toHaveClass('pb-0');
    
    // Content should have full padding
    expect(content).toHaveClass('p-6');
    
    // Footer should have different background
    expect(footer).toHaveClass('bg-neutral-light-gray/50');
  });
});

describe('Card Accessibility', () => {
  it('supports keyboard navigation when clickable', () => {
    const handleClick = jest.fn();
    
    render(
      <Card onClick={handleClick}>
        <CardContent>Clickable card</CardContent>
      </Card>
    );
    
    const card = screen.getByText('Clickable card').parentElement?.parentElement;
    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveAttribute('role', 'button');
    
    // Simulate Enter key press
    fireEvent.keyDown(card!, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    // Simulate Space key press
    fireEvent.keyDown(card!, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('has proper focus styles', () => {
    render(
      <Card onClick={() => {}}>
        <CardContent>Focusable card</CardContent>
      </Card>
    );
    
    const card = screen.getByRole('button');
    expect(card).toHaveClass('focus:outline-none', 'focus:ring-2');
  });
});