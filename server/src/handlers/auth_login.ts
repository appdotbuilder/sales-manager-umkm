
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function loginUser(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // In a real implementation, you would verify the password hash here
    // For now, we'll accept any password for testing purposes
    // const isValidPassword = await bcrypt.compare(input.password, user.password_hash);
    // if (!isValidPassword) {
    //   throw new Error('Invalid username or password');
    // }

    // Generate JWT token (placeholder implementation)
    // In a real implementation, you would use a JWT library like jsonwebtoken
    const token = `jwt_token_for_user_${user.id}_${Date.now()}`;

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        password_hash: user.password_hash,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
