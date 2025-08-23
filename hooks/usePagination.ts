import { useState, useCallback, useMemo } from 'react';

export interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function usePagination<T>(
  items: T[],
  options: PaginationOptions = {},
) {
  const {
    initialPage = 1,
    initialPageSize = 10,
    pageSizeOptions = [10, 20, 50, 100],
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Ensure page is within bounds
  const currentPage = Math.min(Math.max(1, page), totalPages || 1);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  );

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.min(Math.max(1, newPage), totalPages || 1));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const previousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = useCallback(() => {
    goToPage(totalPages);
  }, [goToPage, totalPages]);

  const changePageSize = useCallback((newPageSize: number) => {
    const currentFirstItem = (currentPage - 1) * pageSize + 1;
    const newPage = Math.ceil(currentFirstItem / newPageSize);
    setPageSize(newPageSize);
    setPage(newPage);
  }, [currentPage, pageSize]);

  const state: PaginationState = {
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
  };

  return {
    ...state,
    items: paginatedItems,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    changePageSize,
    pageSizeOptions,
  };
}

// Hook for server-side pagination
export function useServerPagination(options: PaginationOptions = {}) {
  const {
    initialPage = 1,
    initialPageSize = 10,
    pageSizeOptions = [10, 20, 50, 100],
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.min(Math.max(1, page), totalPages || 1);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.min(Math.max(1, newPage), totalPages || 1));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const previousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = useCallback(() => {
    goToPage(totalPages);
  }, [goToPage, totalPages]);

  const changePageSize = useCallback((newPageSize: number) => {
    const currentFirstItem = (currentPage - 1) * pageSize + 1;
    const newPage = Math.ceil(currentFirstItem / newPageSize);
    setPageSize(newPageSize);
    setPage(newPage);
  }, [currentPage, pageSize]);

  const updateTotalItems = useCallback((total: number) => {
    setTotalItems(total);
  }, []);

  const state: PaginationState = {
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    startIndex: (currentPage - 1) * pageSize,
    endIndex: Math.min(currentPage * pageSize, totalItems),
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
  };

  return {
    ...state,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    changePageSize,
    updateTotalItems,
    pageSizeOptions,
  };
}
