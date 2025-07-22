import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import bcrypt from 'bcryptjs';

export async function PUT(request: NextRequest) {
  try {
    const { userId, name, email, currentPassword, newPassword } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get current user
    const currentUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    // Update name if provided
    if (name && name !== currentUser.name) {
      updateData.name = name;
    }

    // Update email if provided
    if (email && email !== currentUser.email) {
      // Check if email is already taken
      const existingUser = await db.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          { error: 'Email is already taken' },
          { status: 400 }
        );
      }

      updateData.email = email;
      updateData.confirmedAt = null; // Reset email verification
    }

    // Update password if provided
    if (newPassword && currentPassword) {
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
      
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      updateData.password = hashedPassword;
    }

    // Update user if there are changes
    if (Object.keys(updateData).length > 0) {
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          confirmedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      console.log('User updated successfully:', { userId, updatedFields: Object.keys(updateData) });

      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'No changes to update',
      user: currentUser,
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 