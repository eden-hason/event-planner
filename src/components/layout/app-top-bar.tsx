'use client';

import Image from 'next/image';

export function AppTopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-[#F4F4F6] px-3">
      {/* App-level start cluster: brand */}
      <a href="#" dir="ltr" className="flex items-center gap-2.5 px-1.5">
        <Image
          src="/kululu-logo-gray.svg"
          alt="Kululu"
          width={32}
          height={32}
          className="size-8"
        />
        <span className="text-xl font-semibold">Kululu</span>
      </a>

      {/* Remaining space for future app-level buttons and elements */}
      <div className="flex flex-1 items-center justify-end gap-2" />
    </header>
  );
}
