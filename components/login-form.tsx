'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState } from 'react';
import { AuthResult } from '@/app/actions/auth';
import { GoogleLoginButton } from '@/components/google-login-button';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [state, formAction, isPending] = useActionState<AuthResult, FormData>(
    async (prevState: AuthResult, formData: FormData) => {
      const phone = formData.get('phone') as string;
      console.log('phone', phone);

      // const result = await loginWithEmailPassword(email, password);
      // return result;

      return { success: false, message: '' };
    },
    {
      success: false,
      message: '',
    },
  );

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Login with your Apple or Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                <GoogleLoginButton />
              </div>
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with
                </span>
              </div>
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Phone Number</Label>
                  </div>
                  <Input id="phone" name="phone" type="tel" required />
                </div>
                {state.message && (
                  <div
                    className={`text-sm ${
                      state.success ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {state.message}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Logging in...' : 'Login'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{' '}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
