"use client";

import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/i18n';
import { useCurrency } from '@/lib/useCurrency';

type FieldBaseProps = {
  id?: string;
  label?: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  className?: string;
  containerClassName?: string;
};

function FieldWrapper({ id, label, required, helpText, error, children, containerClassName }: FieldBaseProps & { children: React.ReactNode }) {
  const describedBy: string[] = [];
  if (helpText) describedBy.push(`${id}-help`);
  if (error) describedBy.push(`${id}-error`);

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-neutral-dark-gray mb-1">
          {label} {required && <span className="text-accent-warning-red">*</span>}
        </label>
      )}
      {children}
      {helpText && !error && (
        <p id={`${id}-help`} className="mt-1 text-xs text-neutral-gray">
          {helpText}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-accent-warning-red">
          {error}
        </p>
      )}
    </div>
  );
}

// TextInput
export type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & FieldBaseProps & {
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  state?: 'default' | 'success' | 'error' | 'loading';
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { id, label, required, helpText, error, className, containerClassName, leftAdornment, rightAdornment, state = 'default', ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id || `input-${autoId}`;
  const describedBy: string[] = [];
  if (helpText) describedBy.push(`${inputId}-help`);
  if (error) describedBy.push(`${inputId}-error`);

  return (
    <FieldWrapper id={inputId} label={label} required={required} helpText={helpText} error={error} containerClassName={containerClassName}>
      <div className="relative">
        {leftAdornment && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftAdornment}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy.join(' ') || undefined}
          className={cn(
            'block w-full rounded-md border border-neutral-gray/30 bg-white placeholder-neutral-gray focus:outline-none focus:ring-2 focus:ring-primary-trust-blue focus:border-primary-trust-blue px-3 py-2 min-h-[44px]',
            leftAdornment && 'pl-10',
            rightAdornment && 'pr-10',
            state === 'success' && 'border-accent-success-emerald/60',
            state === 'error' && 'border-accent-warning-red/60',
            state === 'loading' && 'opacity-75',
            className,
          )}
          {...props}
        />
        {rightAdornment && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightAdornment}
          </div>
        )}
      </div>
    </FieldWrapper>
  );
});

// NumberInput
export type NumberInputProps = Omit<TextInputProps, 'type' | 'inputMode'> & {
  locale?: string;
  min?: number;
  max?: number;
};

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { locale = 'en', onBlur, ...props },
  ref,
) {
  function formatOnBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.currentTarget.value;
    const num = Number(value.replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(num)) {
      e.currentTarget.value = formatNumber(num, locale);
    }
    onBlur?.(e);
  }
  return <TextInput ref={ref} inputMode="decimal" onBlur={formatOnBlur} {...props} />;
});

// CurrencyInput
export type CurrencyInputProps = Omit<TextInputProps, 'type' | 'inputMode'> & { locale?: string };
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(function CurrencyInput(
  { locale = 'en', onBlur, ...props },
  ref,
) {
  const { formatCurrency } = useCurrency();
  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const v = e.currentTarget.value;
    const num = Number(v.replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(num)) {
      e.currentTarget.value = formatCurrency(num, locale);
    }
    onBlur?.(e);
  }
  return <TextInput ref={ref} inputMode="decimal" onBlur={handleBlur} {...props} />;
});

// Select (native, with placeholder)
export type SelectOption = { value: string; label: string; disabled?: boolean };
export type SelectProps = FieldBaseProps & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  options: SelectOption[];
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, required, helpText, error, className, containerClassName, options, placeholder, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id || `select-${autoId}`;
  const describedBy: string[] = [];
  if (helpText) describedBy.push(`${selectId}-help`);
  if (error) describedBy.push(`${selectId}-error`);

  return (
    <FieldWrapper id={selectId} label={label} required={required} helpText={helpText} error={error} containerClassName={containerClassName}>
      <select
        id={selectId}
        ref={ref}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy.join(' ') || undefined}
        className={cn('block w-full rounded-md border border-neutral-gray/30 bg-white focus:outline-none focus:ring-2 focus:ring-primary-trust-blue focus:border-primary-trust-blue px-3 py-2 min-h-[44px]', className)}
        {...props}
      >
        {placeholder && (
          <option value="" disabled={true} hidden>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
});

// Checkbox
export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> & FieldBaseProps;
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ id, label, required, helpText, error, containerClassName, className, ...props }, ref) {
  const autoId = useId();
  const checkboxId = id || `chk-${autoId}`;
  return (
    <FieldWrapper id={checkboxId} label={label} required={required} helpText={helpText} error={error} containerClassName={containerClassName}>
      <input
        id={checkboxId}
        ref={ref}
        type="checkbox"
        className={cn('h-5 w-5 rounded border-neutral-gray/30 text-primary-trust-blue focus:ring-primary-trust-blue', className)}
        {...props}
      />
    </FieldWrapper>
  );
});

// Radio Group
export type RadioOption = { value: string; label: string; helpText?: string; disabled?: boolean };
export type RadioGroupProps = FieldBaseProps & {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
};
export function RadioGroup({ id, label, required, helpText, error, name, options, value, onChange, containerClassName }: RadioGroupProps) {
  const autoId = useId();
  const groupId = id || `rg-${autoId}`;
  return (
    <FieldWrapper id={groupId} label={label} required={required} helpText={helpText} error={error} containerClassName={containerClassName}>
      <div role="radiogroup" aria-labelledby={`${groupId}-label`}>
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 py-1">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange?.(opt.value)}
              disabled={opt.disabled}
              className="h-4 w-4 text-primary-trust-blue focus:ring-primary-trust-blue"
            />
            <span className="text-sm text-neutral-dark-gray">{opt.label}</span>
            {opt.helpText && <span className="text-xs text-neutral-gray">{opt.helpText}</span>}
          </label>
        ))}
      </div>
    </FieldWrapper>
  );
}

// Textarea (auto-resize)
export type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> & FieldBaseProps & { minRows?: number; maxRows?: number };
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ id, label, required, helpText, error, className, containerClassName, minRows = 3, maxRows = 10, onChange, ...props }, ref) {
  const autoId = useId();
  const textareaId = id || `ta-${autoId}`;
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);
  useEffect(() => {
    if (innerRef.current) {
      const ta = innerRef.current;
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, maxRows * 24)}px`;
    }
  });
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, maxRows * 24)}px`;
    onChange?.(e);
  }
  return (
    <FieldWrapper id={textareaId} label={label} required={required} helpText={helpText} error={error} containerClassName={containerClassName}>
      <textarea
        id={textareaId}
        ref={innerRef}
        rows={minRows}
        className={cn('block w-full rounded-md border border-neutral-gray/30 bg-white placeholder-neutral-gray focus:outline-none focus:ring-2 focus:ring-primary-trust-blue focus:border-primary-trust-blue px-3 py-2', className)}
        onChange={handleChange}
        {...props}
      />
    </FieldWrapper>
  );
});

// Date input (native)
export type DateInputProps = Omit<TextInputProps, 'type'>;
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(props, ref) {
  return <TextInput ref={ref} type="date" {...props} />;
});

