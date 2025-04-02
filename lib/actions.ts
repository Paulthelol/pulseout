'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticateSpotify(
    prevState: string | undefined,
    formData: FormData
) {
    console.log('authenticateSpotify Server Action called!');
    try {
        await signIn('spotify', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            console.error('Error during signIn:', error);
            switch (error.type) {
              case 'CredentialsSignin':
                return 'Invalid credentials.';
              default:
                throw error;
            }
          }
          throw error;
    }
}

export async function SignOut() {
    await signOut();
}