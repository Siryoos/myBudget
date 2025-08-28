/* If import fails, adjust the path to the hooks module. Assumed path: src/hooks/useApi.ts */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
/*
  Note on testing library/framework:
  - These tests assume the project uses React Testing Library with either Jest or Vitest test runner,
    following existing repository conventions discovered by CI.
  - If using Vitest, globals like vi are available; for Jest, use jest.*. We guard with fallbacks.
*/
const isVitest = typeof (global as any).vi !== 'undefined';
const spy = isVitest ? (global as any).vi : jest;
const advanceTimers = async (ms = 0) => {
  // In some setups, immediate effects may need a tick; this helper is a no-op unless fake timers are enabled.
  await Promise.resolve();
};

//
// Import the hooks under test.
//
// Adjust the import path if hooks are placed elsewhere; default common path shown below.
// The repository context search should confirm the actual relative path to the hook module.
//
import {
  useApi,
  usePaginatedApi,
  useMutation,
  useOptimisticMutation,
} from '../../src/hooks/useApi';

describe('useApi', () => {
  it('should initialize with default state (no immediate)', () => {
    const apiCall = spy.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useApi(apiCall, { immediate: false }));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.refetch).toBe('function');
    expect(apiCall).not.toHaveBeenCalled();
  });

  it('should call api and set data on success, invoking onSuccess and returning data', async () => {
    const data = { id: 1, name: 'Alice' };
    const apiCall = spy.fn().mockResolvedValue(data);
    const onSuccess = spy.fn();
    const { result } = renderHook(() => useApi(apiCall, { immediate: false, onSuccess }));

    let returned: any;
    await act(async () => {
      returned = await result.current.execute();
    });

    expect(apiCall).toHaveBeenCalledTimes(1);
    expect(returned).toEqual(data);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(data);
    expect(onSuccess).toHaveBeenCalledWith(data);
  });

  it('should set loading true during execution and reset to false after', async () => {
    const deferred = () =>
      new Promise<string>((resolve) => setTimeout(() => resolve('done'), 0));
    const apiCall = spy.fn().mockImplementation(deferred);
    const { result } = renderHook(() => useApi(apiCall, { immediate: false }));

    let pending: Promise<any>;
    await act(async () => {
      pending = result.current.execute();
      expect(result.current.loading).toBe(true);
      await pending;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('done');
  });

  it('should set error on Error throws and invoke onError with the error, rethrowing', async () => {
    const err = new Error('Boom');
    const apiCall = spy.fn().mockRejectedValue(err);
    const onError = spy.fn();
    const { result } = renderHook(() => useApi(apiCall, { onError }));

    await expect(
      act(async () => {
        await result.current.execute();
      })
    ).rejects.toThrow('Boom');

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Boom');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBe(err);
  });

  it('should map non-Error throws to generic message and pass Error to onError, rethrowing', async () => {
    const apiCall = spy.fn().mockRejectedValue('not-an-error');
    const onError = spy.fn();
    const { result } = renderHook(() => useApi(apiCall, { onError }));

    await expect(
      act(async () => {
        await result.current.execute();
      })
    ).rejects.toBe('not-an-error');

    expect(result.current.error).toBe('An error occurred');
    expect(onError).toHaveBeenCalledTimes(1);
    const passed = onError.mock.calls[0][0];
    expect(passed).toBeInstanceOf(Error);
    expect((passed as Error).message).toBe('An error occurred');
  });

  it('should reset state to initial values when reset is called', async () => {
    const apiCall = spy.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useApi(apiCall));

    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.data).toEqual({ ok: true });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('refetch should delegate to execute', async () => {
    const apiCall = spy.fn().mockResolvedValue(123);
    const { result } = renderHook(() => useApi(apiCall));

    await act(async () => {
      await result.current.refetch();
    });

    expect(apiCall).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe(123);
  });

  it('should auto-execute when options.immediate is true', async () => {
    const apiCall = spy.fn().mockResolvedValue('auto');
    const { result } = renderHook(() => useApi(apiCall, { immediate: true }));
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('auto');
  });
});

describe('usePaginatedApi', () => {
  type Item = { id: number };
  type PageResp = { data: Item[]; pagination: { hasNext: boolean; total?: number } };

  it('should call api immediately with initial page/limit and expose pagination/data', async () => {
    const apiCall = spy
      .fn<[], Promise<PageResp>>()
      .mockResolvedValue({ data: [{ id: 1 }], pagination: { hasNext: true, total: 10 } });

    const { result } = renderHook(() => usePaginatedApi<Item>(apiCall, 2, 5));

    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1));
    // The immediate call should use page=2, limit=5
    expect(apiCall).toHaveBeenLastCalledWith(2, 5);

    // Data mapping (flatten inner data to [] on return)
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data).toEqual([{ id: 1 }]);
    expect(result.current.pagination).toEqual({ hasNext: true, total: 10 });
    expect(result.current.page).toBe(2);
    expect(result.current.limit).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it('loadMore should increment page only when not loading and hasNext is true', async () => {
    // First response has hasNext=true, second also true, third false
    const responses: PageResp[] = [
      { data: [{ id: 1 }], pagination: { hasNext: true } },
      { data: [{ id: 2 }], pagination: { hasNext: true } },
      { data: [{ id: 3 }], pagination: { hasNext: false } },
    ];
    const apiCall = spy.fn().mockImplementation(() => Promise.resolve(responses[Math.min(apiCall.mock.calls.length - 1, 2)]));

    const { result, rerender } = renderHook(() => usePaginatedApi<Item>(apiCall, 1, 2));
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1));
    expect(result.current.page).toBe(1);

    // loadMore allowed: hasNext=true, not loading
    act(() => {
      result.current.loadMore();
    });
    // Changing page should trigger a new immediate fetch for page=2
    rerender();
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(2));
    expect(apiCall).toHaveBeenLastCalledWith(2, 2);
    expect(result.current.page).toBe(2);

    // Now update until hasNext=false
    act(() => {
      result.current.loadMore();
    });
    rerender();
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(3));
    expect(apiCall).toHaveBeenLastCalledWith(3, 2);
    expect(result.current.page).toBe(3);

    // When hasNext=false, loadMore should not increment page
    act(() => {
      result.current.loadMore();
    });
    rerender();
    // No additional call expected
    await advanceTimers();
    expect(apiCall).toHaveBeenCalledTimes(3);
    expect(result.current.page).toBe(3);
  });

  it('changePage should set page and trigger refetch with the new page', async () => {
    const apiCall = spy.fn().mockResolvedValue({ data: [], pagination: { hasNext: true } });
    const { result, rerender } = renderHook(() => usePaginatedApi<Item>(apiCall, 1, 10));
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1));
    expect(apiCall).toHaveBeenLastCalledWith(1, 10);

    act(() => result.current.changePage(5));
    rerender();
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(2));
    expect(apiCall).toHaveBeenLastCalledWith(5, 10);
    expect(result.current.page).toBe(5);
  });

  it('changeLimit should set limit and reset page to 1, triggering refetch', async () => {
    const apiCall = spy.fn().mockResolvedValue({ data: [], pagination: { hasNext: true } });
    const { result, rerender } = renderHook(() => usePaginatedApi<Item>(apiCall, 3, 25));
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1));
    expect(apiCall).toHaveBeenLastCalledWith(3, 25);

    act(() => result.current.changeLimit(50));
    rerender();
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(2));
    expect(apiCall).toHaveBeenLastCalledWith(1, 50);
    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(50);
  });

  it('propagates error state from useApi when apiCall rejects', async () => {
    const err = new Error('Page fail');
    const apiCall = spy.fn().mockRejectedValue(err);
    const { result } = renderHook(() => usePaginatedApi<Item>(apiCall, 1, 10));

    await waitFor(() => {
      // loading should eventually be false after rejection inside nested useApi
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('Page fail');
    expect(result.current.data).toEqual([]);
  });
});

describe('useMutation', () => {
  it('initial state should be idle', () => {
    const mutation = spy.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useMutation<string, { x: number }>(mutation));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('mutate sets loading, resolves data, and resets loading', async () => {
    const mutation = spy.fn().mockResolvedValue({ saved: true });
    const { result } = renderHook(() => useMutation<{ saved: boolean }, { id: number }>(mutation));

    let out: any;
    await act(async () => {
      out = await result.current.mutate({ id: 7 });
    });

    expect(out).toEqual({ saved: true });
    expect(mutation).toHaveBeenCalledWith({ id: 7 });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({ saved: true });
  });

  it('mutate sets error string and rethrows on Error thrown', async () => {
    const err = new Error('Save failed');
    const mutation = spy.fn().mockRejectedValue(err);
    const { result } = renderHook(() =>
      useMutation<{ ok: boolean }, { id: number }>(mutation)
    );

    await expect(
      act(async () => {
        await result.current.mutate({ id: 1 });
      })
    ).rejects.toThrow('Save failed');

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Save failed');
    expect(result.current.data).toBeNull();
  });

  it('mutate maps non-Error throws to generic message, rethrowing original', async () => {
    const mutation = spy.fn().mockRejectedValue('oops');
    const { result } = renderHook(() => useMutation<number, void>(mutation));

    await expect(
      act(async () => {
        // @ts-expect-error testing void vars
        await result.current.mutate();
      })
    ).rejects.toBe('oops');

    expect(result.current.error).toBe('An error occurred');
  });

  it('reset clears state', async () => {
    const mutation = spy.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useMutation<string, void>(mutation));
    await act(async () => {
      // @ts-expect-error testing void vars
      await result.current.mutate();
    });
    expect(result.current.data).toBe('ok');

    act(() => result.current.reset());
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

describe('useOptimisticMutation', () => {
  type Vars = { id: number };
  type Resp = { ok: boolean };

  it('invokes onMutate before async work, sets data on success, and calls onSuccess/onSettled', async () => {
    const mutation = spy.fn().mockResolvedValue({ ok: true } as Resp);
    const onMutate = spy.fn();
    const onSuccess = spy.fn();
    const onSettled = spy.fn();

    const { result } = renderHook(() =>
      useOptimisticMutation<Resp, Vars>(mutation, { onMutate, onSuccess, onSettled })
    );

    let out: Resp;
    await act(async () => {
      out = await result.current.mutate({ id: 42 });
    });

    expect(onMutate).toHaveBeenCalledWith({ id: 42 });
    expect(mutation).toHaveBeenCalledWith({ id: 42 });
    expect(out!).toEqual({ ok: true });
    expect(result.current.data).toEqual({ ok: true });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith({ ok: true }, { id: 42 });
    expect(onSettled).toHaveBeenCalledWith({ ok: true }, null, { id: 42 });
  });

  it('handles Error rejection: sets error string, calls onError and onSettled with Error', async () => {
    const err = new Error('nope');
    const mutation = spy.fn().mockRejectedValue(err);
    const onError = spy.fn();
    const onSettled = spy.fn();

    const { result } = renderHook(() =>
      useOptimisticMutation<Resp, Vars>(mutation, { onError, onSettled })
    );

    await expect(
      act(async () => {
        await result.current.mutate({ id: 1 });
      })
    ).rejects.toThrow('nope');

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('nope');
    expect(onError).toHaveBeenCalledTimes(1);
    const passed = onError.mock.calls[0][0];
    expect(passed).toBe(err);
    expect(onSettled).toHaveBeenCalledWith(null, err, { id: 1 });
  });

  it('maps non-Error rejection to generic message and passes a real Error to callbacks', async () => {
    const mutation = spy.fn().mockRejectedValue('bad');
    const onError = spy.fn();
    const onSettled = spy.fn();

    const { result } = renderHook(() =>
      useOptimisticMutation<Resp, Vars>(mutation, { onError, onSettled })
    );

    await expect(
      act(async () => {
        await result.current.mutate({ id: 9 });
      })
    ).rejects.toBe('bad');

    expect(result.current.error).toBe('An error occurred');
    const errObj = onError.mock.calls[0][0];
    expect(errObj).toBeInstanceOf(Error);
    expect(errObj.message).toBe('An error occurred');
    const settledErr = onSettled.mock.calls[0][1];
    expect(settledErr).toBeInstanceOf(Error);
    expect(settledErr.message).toBe('An error occurred');
  });
});