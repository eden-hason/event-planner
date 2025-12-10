'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface GuestSearchProps {
  searchTerm: string;
  onSearchChange: (searchTerm: string) => void;
}

export function GuestSearch({ searchTerm, onSearchChange }: GuestSearchProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
      <Input
        placeholder="Search guests..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="pl-10"
      />
    </div>
  );
}

