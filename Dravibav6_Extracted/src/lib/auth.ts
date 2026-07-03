import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

export class AuthService {
  /**
   * Send OTP to email for registration
   */
  async sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }

  /**
   * Verify OTP and set password for new user
   */
  async verifyOtpAndSetPassword(
    email: string,
    token: string,
    password: string,
    username: string
  ): Promise<User> {
    // Verify OTP
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;

    // Update user with password and username
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password,
      data: { username },
    });
    if (updateError) throw updateError;

    return updateData.user!;
  }

  /**
   * Sign in with email and password
   */
  async signInWithPassword(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  }

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}

export const authService = new AuthService();
