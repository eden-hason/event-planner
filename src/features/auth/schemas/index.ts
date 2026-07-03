export interface User {
  id: string;
  email?: string;
  phone?: string;
  displayName: string;
  avatar: string;
}

export interface ProfileData {
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  initialSetupComplete: boolean;
}
