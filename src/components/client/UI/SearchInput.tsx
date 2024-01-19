'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '../../ui/input';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Label } from '@radix-ui/react-label';
import { useDebouncedCallback } from 'use-debounce';

export default function Search() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <form className="relative mx-4">
      <MagnifyingGlassIcon className="absolute w-4 h-4 text-gray-400 left-3 top-3" />
      <Input
        className="pl-8 rounded-md shadow-sm"
        placeholder="Search..."
        type="search"
        onChange={(e) => {
          handleSearch(e.target.value);
        }}
        defaultValue={searchParams.get('query')?.toString()}
      />
      <Label className="sr-only" htmlFor="search">
        Search
      </Label>
    </form>
  );
}
