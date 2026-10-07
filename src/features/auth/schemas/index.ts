export interface User {
  id: string;
  email?: string;
  phone?: string;
  displayName: string;
  avatar: string;
  /**
   * A Visitor: planning without an account (ADR 0028). They can use the
   * workspace, but nothing that reaches people or costs money until they save.
   */
  isVisitor?: boolean;
}

export interface ProfileData {
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  initialSetupComplete: boolean;
}
