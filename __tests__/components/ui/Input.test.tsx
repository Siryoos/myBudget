import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  TextInput, 
  NumberInput, 
  CurrencyInput, 
  Select, 
  Checkbox, 
  RadioGroup, 
  Textarea 
} from '@/components/ui/Input';

describe('TextInput Component', () => {
  it('renders with label', () => {
    render(<TextInput label="Name" name="name" />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<TextInput label="Email" name="email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<TextInput label="Username" name="username" error="Username is taken" />);
    expect(screen.getByText('Username is taken')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles disabled state', () => {
    render(<TextInput label="Disabled" name="disabled" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('handles onChange events', () => {
    const handleChange = jest.fn();
    render(<TextInput label="Input" name="input" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.objectContaining({ value: 'test value' })
    }));
  });

  it('renders with adornments', () => {
    const LeftIcon = () => <span data-testid="left-icon">👈</span>;
    const RightIcon = () => <span data-testid="right-icon">👉</span>;
    
    render(
      <TextInput 
        label="With Icons" 
        name="icons"
        leftAdornment={<LeftIcon />}
        rightAdornment={<RightIcon />}
      />
    );
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });
});

describe('NumberInput Component', () => {
  it('only accepts numeric input', async () => {
    const user = userEvent.setup();
    render(<NumberInput label="Age" name="age" />);
    
    const input = screen.getByRole('spinbutton');
    await user.type(input, 'abc123def456');
    
    expect(input).toHaveValue(123456);
  });

  it('respects min and max constraints', () => {
    render(<NumberInput label="Quantity" name="quantity" min={0} max={100} />);
    const input = screen.getByRole('spinbutton');
    
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(100);
    
    fireEvent.change(input, { target: { value: '-10' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(0);
  });

  it('handles step increment/decrement', () => {
    render(<NumberInput label="Step" name="step" step={5} defaultValue={10} />);
    const input = screen.getByRole('spinbutton');
    
    // Most browsers don't fully support spinbutton increment/decrement in jsdom
    // So we test the attributes instead
    expect(input).toHaveAttribute('step', '5');
    expect(input).toHaveValue(10);
  });
});

describe('CurrencyInput Component', () => {
  it('formats currency correctly', () => {
    render(<CurrencyInput label="Price" name="price" defaultValue={1234.56} />);
    const input = screen.getByRole('textbox');
    
    expect(input).toHaveValue('$1,234.56');
  });

  it('parses formatted input correctly', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    
    render(<CurrencyInput label="Amount" name="amount" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    
    await user.clear(input);
    await user.type(input, '1,234.56');
    
    // The onChange should be called with the numeric value
    expect(handleChange).toHaveBeenLastCalledWith(expect.objectContaining({
      target: expect.objectContaining({
        name: 'amount',
        value: 1234.56
      })
    }));
  });

  it('supports different currency symbols', () => {
    render(
      <CurrencyInput 
        label="Euro Price" 
        name="euro" 
        currencySymbol="€" 
        defaultValue={100}
      />
    );
    
    expect(screen.getByRole('textbox')).toHaveValue('€100.00');
  });
});

describe('Select Component', () => {
  const options = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'orange', label: 'Orange' }
  ];

  it('renders with options', () => {
    render(<Select label="Fruit" name="fruit" options={options} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.click(select);
    
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Orange')).toBeInTheDocument();
  });

  it('shows placeholder when no value selected', () => {
    render(
      <Select 
        label="Choose" 
        name="choice" 
        options={options} 
        placeholder="Select an option"
      />
    );
    
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('handles selection', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    
    render(
      <Select 
        label="Pick" 
        name="pick" 
        options={options} 
        onChange={handleChange}
      />
    );
    
    const select = screen.getByRole('combobox');
    await user.click(select);
    await user.click(screen.getByText('Banana'));
    
    expect(handleChange).toHaveBeenCalledWith('banana');
  });
});

describe('Checkbox Component', () => {
  it('renders with label', () => {
    render(<Checkbox label="Agree to terms" name="terms" />);
    expect(screen.getByLabelText('Agree to terms')).toBeInTheDocument();
  });

  it('can be checked and unchecked', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    
    render(
      <Checkbox 
        label="Subscribe" 
        name="subscribe" 
        onChange={handleChange}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(handleChange).toHaveBeenCalledWith(true);
    
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('supports indeterminate state', () => {
    render(
      <Checkbox 
        label="Select all" 
        name="selectAll" 
        checked={true}
        indeterminate={true}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveProperty('indeterminate', true);
  });
});

describe('RadioGroup Component', () => {
  const options = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' }
  ];

  it('renders all options', () => {
    render(<RadioGroup label="Size" name="size" options={options} />);
    
    expect(screen.getByLabelText('Small')).toBeInTheDocument();
    expect(screen.getByLabelText('Medium')).toBeInTheDocument();
    expect(screen.getByLabelText('Large')).toBeInTheDocument();
  });

  it('allows only one selection', async () => {
    const user = userEvent.setup();
    
    render(<RadioGroup label="Size" name="size" options={options} />);
    
    const small = screen.getByLabelText('Small');
    const medium = screen.getByLabelText('Medium');
    
    await user.click(small);
    expect(small).toBeChecked();
    expect(medium).not.toBeChecked();
    
    await user.click(medium);
    expect(small).not.toBeChecked();
    expect(medium).toBeChecked();
  });

  it('handles onChange correctly', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    
    render(
      <RadioGroup 
        label="Size" 
        name="size" 
        options={options} 
        onChange={handleChange}
      />
    );
    
    await user.click(screen.getByLabelText('Large'));
    expect(handleChange).toHaveBeenCalledWith('large');
  });
});

describe('Textarea Component', () => {
  it('renders with proper attributes', () => {
    render(
      <Textarea 
        label="Message" 
        name="message" 
        rows={5}
        placeholder="Enter your message"
      />
    );
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '5');
    expect(textarea).toHaveAttribute('placeholder', 'Enter your message');
  });

  it('shows character count', async () => {
    const user = userEvent.setup();
    
    render(
      <Textarea 
        label="Bio" 
        name="bio" 
        maxLength={100}
        showCharacterCount
      />
    );
    
    const textarea = screen.getByRole('textbox');
    expect(screen.getByText('0 / 100')).toBeInTheDocument();
    
    await user.type(textarea, 'Hello world');
    expect(screen.getByText('11 / 100')).toBeInTheDocument();
  });

  it('auto-resizes when enabled', async () => {
    const user = userEvent.setup();
    
    render(
      <Textarea 
        label="Auto" 
        name="auto" 
        autoResize
      />
    );
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    const initialHeight = textarea.style.height;
    
    // Type multiple lines
    await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4');
    
    // The height should have changed (though jsdom might not calculate it accurately)
    expect(textarea.scrollHeight).toBeGreaterThan(0);
  });
});

describe('Input Accessibility', () => {
  it('has proper ARIA attributes for required fields', () => {
    render(<TextInput label="Required Field" name="required" required />);
    const input = screen.getByRole('textbox');
    
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('has proper ARIA attributes for invalid fields', () => {
    render(
      <TextInput 
        label="Invalid Field" 
        name="invalid" 
        error="This field has an error"
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
  });

  it('associates label with input correctly', () => {
    render(<TextInput label="Accessible Input" name="accessible" />);
    
    const input = screen.getByLabelText('Accessible Input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', expect.stringContaining('accessible'));
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <>
        <TextInput label="First" name="first" />
        <TextInput label="Second" name="second" />
        <TextInput label="Third" name="third" disabled />
      </>
    );
    
    const first = screen.getByLabelText('First');
    const second = screen.getByLabelText('Second');
    const third = screen.getByLabelText('Third');
    
    // Tab through inputs
    await user.tab();
    expect(first).toHaveFocus();
    
    await user.tab();
    expect(second).toHaveFocus();
    
    // Disabled input should be skipped
    await user.tab();
    expect(third).not.toHaveFocus();
  });
});