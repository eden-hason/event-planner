'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SetupRedirectProps {
  isSetupComplete: boolean;
}

export function SetupRedirect({ isSetupComplete }: SetupRedirectProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only redirect if setup is not complete and we're not already on the onboarding page
    if (!isSetupComplete && pathname !== '/app/onboarding') {
      router.push('/app/onboarding');
    }
  }, [isSetupComplete, pathname, router]);

  // Don't render anything - this component only handles redirects
  return null;
}



