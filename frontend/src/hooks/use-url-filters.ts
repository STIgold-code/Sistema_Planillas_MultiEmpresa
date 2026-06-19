'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export function useUrlFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const getFilter = useCallback(
    (key: string): string => searchParams.get(key) || '',
    [searchParams],
  );

  const buildUrl = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname],
  );

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key !== 'page') {
        params.delete('page');
      }
      router.replace(buildUrl(params), { scroll: false });
    },
    [searchParams, router, buildUrl],
  );

  const setFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      let resetPage = false;
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== 'all') {
          params.set(key, value);
        } else {
          params.delete(key);
        }
        if (key !== 'page') resetPage = true;
      }
      if (resetPage) params.delete('page');
      router.replace(buildUrl(params), { scroll: false });
    },
    [searchParams, router, buildUrl],
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const page = parseInt(searchParams.get('page') || '1', 10);

  const setPage = useCallback(
    (p: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (p > 1) {
        params.set('page', p.toString());
      } else {
        params.delete('page');
      }
      router.replace(buildUrl(params), { scroll: false });
    },
    [searchParams, router, buildUrl],
  );

  return {
    getFilter,
    setFilter,
    setFilters,
    clearFilters,
    page,
    setPage,
    filterParams: searchParams.toString(),
  };
}
