import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { validateResetToken } from '../request-password-reset/route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      console.error('Missing token or newPassword:', { token, newPassword });
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      console.error('Password too short:', newPassword);
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Validate the reset token
    const tokenData = await validateResetToken(token);
    if (!tokenData) {
      console.error('Invalid or expired reset token:', token);
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    const { email } = tokenData;

    try {
      // Find the user in the database
      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        console.error('User not found for email:', email);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password
      await db.user.update({
        where: { email },
        data: { password: hashedPassword }
      });

      // Delete the used reset token
      await db.resetToken.delete({ where: { token } });

      console.log('Password reset successfully for:', email);
      return NextResponse.json({ success: true });

    } catch (dbError) {
      console.error('Database error during password reset:', dbError);
      return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 