'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { IconCamera, IconLoader2, IconUser } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  FileUpload,
  FileUploadTrigger,
} from '@/components/ui/file-upload';
import { updateUserProfile, saveAvatarUrl } from '@/features/auth/actions';
import { uploadAvatarImage } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import type { ProfileData } from '@/features/auth/schemas';

interface PersonalInfoStepProps {
  profile: ProfileData;
  onComplete: () => void;
}

export function PersonalInfoStep({ profile, onComplete }: PersonalInfoStepProps) {
  const t = useTranslations('personalInfo');
  const locale = useLocale();
  const isRtl = locale === 'he';
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleAvatarChange = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setIsUploading(true);
    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsUploading(false); return; }

    const { url, error } = await uploadAvatarImage(file, user.id);
    if (error) {
      toast.error(t('toast.uploadError'));
      setAvatarUrl(profile.avatarUrl);
    } else if (url) {
      setAvatarUrl(url);
      await saveAvatarUrl(url);
    }
    setIsUploading(false);
  };

  const handleSave = async () => {
    setIsPending(true);
    const formData = new FormData();
    formData.set('full_name', fullName);
    formData.set('phone_number', phoneNumber);
    if (avatarUrl) formData.set('avatar_url', avatarUrl);

    const promise = updateUserProfile(formData).then((result) => {
      if (!result.success) throw new Error(result.message || t('toast.error'));
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.saving'),
      success: () => { onComplete(); return t('toast.saved'); },
      error: (err) => (err instanceof Error ? err.message : t('toast.error')),
    });

    try {
      await promise;
    } catch {
      // handled by toast
    } finally {
      setIsPending(false);
    }
  };

  const handleSkip = async () => {
    setIsPending(true);
    await updateUserProfile(new FormData());
    setIsPending(false);
    onComplete();
  };

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const isBusy = isPending || isUploading;

  return (
    <div className="flex h-full items-center justify-center px-4 py-8">
      <div className="bg-card border-border mx-auto w-full max-w-sm rounded-lg border p-8">
        <div className="mb-6 flex flex-col gap-1.5">
          <h2 className="text-xl font-bold">{t('title')}</h2>
          <p className="text-muted-foreground text-sm">{t('description')}</p>
        </div>

        <div className="flex flex-col gap-5">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-2">
            <FileUpload
              accept="image/*"
              maxFiles={1}
              maxSize={5 * 1024 * 1024}
              onValueChange={handleAvatarChange}
              disabled={isBusy}
            >
              <FileUploadTrigger asChild>
                <button
                  type="button"
                  className="group relative cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isBusy}
                >
                  <Avatar className="size-20">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || ''} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {avatarUrl ? initials : <IconUser size={28} />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    {isUploading
                      ? <IconLoader2 size={20} className="animate-spin text-white" />
                      : <IconCamera size={20} className="text-white" />
                    }
                  </div>
                </button>
              </FileUploadTrigger>
            </FileUpload>
            <p className="text-muted-foreground text-xs">{t('avatarLabel')}</p>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs font-medium">
              {t('nameLabel')}
            </label>
            <Input
              placeholder={t('namePlaceholder')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isBusy}
            />
          </div>

          {/* Email (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs font-medium">
              {t('emailLabel')}
            </label>
            <Input value={profile.email} readOnly disabled className="opacity-60" />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs font-medium">
              {t('phoneLabel')}
            </label>
            <Input
              placeholder={t('phonePlaceholder')}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isBusy}
              type="tel"
              dir={isRtl ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleSave} disabled={isBusy} className="w-full">
              {t('save')}
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isBusy}
              className="text-muted-foreground w-full"
            >
              {t('skip')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
