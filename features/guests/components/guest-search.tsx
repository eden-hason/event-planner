'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { IconSearch } from '@tabler/icons-react';

interface GuestSearchProps {
  searchTerm: string;
  onSearchChange: (searchTerm: string) => void;
}

export function GuestSearch({ searchTerm, onSearchChange }: GuestSearchProps) {
  const t = useTranslations('guests');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="relative">
      <IconSearch size={16} className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" />
      <Input
        placeholder={t('search.placeholder')}
        value={searchTerm}
        onChange={handleSearchChange}
        className="pl-10"
      />
    </div>
  );
}
