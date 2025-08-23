import { renderHook, act } from '@testing-library/react';

import { useErrorHandler } from '../../hooks/useErrorHandler';
import { ValidationError } from '../../lib/error-handling';
import * as errorReporting from '../../lib/error-reporting';

// Mock error reporter
jest.mock('../../lib/error-reporting', () => ({
  errorReporter: {
    captureError: jest.fn(),
  },
}));

// Mock toast
const mockToast = jest.fn();
jest.mock('../../hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle error and show toast by default', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');

    await act(async () => {
      await result.current.handle(error);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.isError).toBe(true);
    expect(result.current.errorMessage).toBe('Test error');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Test error',
      variant: 'error',
    });
  });

  it('should not show toast when disabled', async () => {
    const { result } = renderHook(() => useErrorHandler({ showToast: false }));
    const error = new Error('Test error');

    await act(async () => {
      await result.current.handle(error);
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('should handle API errors with proper messages', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new ValidationError('Bad request');

    await act(async () => {
      await result.current.handle(error);
    });

    expect(result.current.errorMessage).toBe('Bad request');
  });

  it('should handle network errors', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Network error');

    await act(async () => {
      await result.current.handle(error);
    });

    expect(result.current.errorMessage).toBe('Network error');
  });

  it('should prevent duplicate error handling', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Duplicate error');

    await act(async () => {
      await result.current.handle(error);
      await result.current.handle(error);
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('should reset error state', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.throwError('Test error');
    });

    expect(result.current.isError).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it('should call custom onError callback', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useErrorHandler({ onError }));
    const error = new Error('Test error');

    await act(async () => {
      await result.current.handle(error);
    });

    expect(onError).toHaveBeenCalledWith(error, 'Test error');
  });

  it('should apply custom recovery strategies', async () => {
    const mockRecover = jest.fn();
    const strategies = [{
      canRecover: (error: Error) => error.message === 'Recoverable',
      recover: mockRecover,
    }];

    const { result } = renderHook(() => useErrorHandler({ strategies }));
    const error = new Error('Recoverable');

    await act(async () => {
      await result.current.handle(error);
    });

    expect(mockRecover).toHaveBeenCalled();
  });
});
