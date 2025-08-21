import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsync } from '@/hooks/useAsync';

describe('useAsync', () => {
  it('should handle successful async operations', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue('Success');
    const { result } = renderHook(() => useAsync(mockAsyncFn));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.execute('arg1', 'arg2');
    });

    expect(mockAsyncFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(result.current.data).toBe('Success');
    expect(result.current.loading).toBe(false);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle failed async operations', async () => {
    const error = new Error('Failed');
    const mockAsyncFn = jest.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useAsync(mockAsyncFn));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (e) {
        // Expected to throw
      }
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(error);
    expect(result.current.isError).toBe(true);
  });

  it('should set loading state during execution', async () => {
    const mockAsyncFn = jest.fn(() => 
      new Promise(resolve => setTimeout(() => resolve('Done'), 100))
    );
    const { result } = renderHook(() => useAsync(mockAsyncFn));

    act(() => {
      result.current.execute();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should call onSuccess callback', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue('Success');
    const onSuccess = jest.fn();
    const { result } = renderHook(() => 
      useAsync(mockAsyncFn, { onSuccess })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(onSuccess).toHaveBeenCalledWith('Success');
  });

  it('should call onError callback', async () => {
    const error = new Error('Failed');
    const mockAsyncFn = jest.fn().mockRejectedValue(error);
    const onError = jest.fn();
    const { result } = renderHook(() => 
      useAsync(mockAsyncFn, { onError })
    );

    await act(async () => {
      try {
        await result.current.execute();
      } catch (e) {
        // Expected
      }
    });

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const mockAsyncFn = jest.fn(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error('Retry'));
      }
      return Promise.resolve('Success');
    });

    const { result } = renderHook(() => 
      useAsync(mockAsyncFn, { retries: 3, retryDelay: 10 })
    );

    // Execute the async operation (this will start the retry process)
    act(() => {
      result.current.execute();
    });

    // Wait for the hook to reach its final state after retries complete
    // Use a timeout slightly larger than total retry time: retries * retryDelay
    // 3 retries * 10ms delay = 30ms, so use 100ms timeout for safety
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    }, { timeout: 100 });

    // Now verify the final state
    expect(mockAsyncFn).toHaveBeenCalledTimes(3);
    expect(result.current.data).toBe('Success');
    expect(result.current.isSuccess).toBe(true);
  });

  it('should cancel pending requests', async () => {
    const mockAsyncFn = jest.fn(() => 
      new Promise(resolve => setTimeout(() => resolve('Done'), 1000))
    );
    const { result } = renderHook(() => useAsync(mockAsyncFn));

    act(() => {
      result.current.execute();
    });

    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.cancel();
    });

    expect(result.current.loading).toBe(false);
  });

  it('should reset state', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue('Success');
    const { result } = renderHook(() => useAsync(mockAsyncFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('Success');

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(false);
  });
});
