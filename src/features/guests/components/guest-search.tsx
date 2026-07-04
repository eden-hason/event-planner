'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { IconSearch } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface GuestSearchProps {
  searchTerm: string;
  onSearchChange: (searchTerm: string) => void;
  className?: string;
}

export function GuestSearch({ searchTerm, onSearchChange, className }: GuestSearchProps) {
  const t = useTranslations('guests');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="relative w-full">
      <IconSearch size={16} className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" />
      <Input
        placeholder={t('search.placeholder')}
        value={searchTerm}
        onChange={handleSearchChange}
        className={cn('pl-10', className)}
      />
    </div>
  );
}
