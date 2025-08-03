
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput, type User } from '../schema';
import { eq, or } from 'drizzle-orm';

export const registerUser = async (input: RegisterInput): Promise<User> => {
  try {
    // Check if username or email already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, input.username),
          eq(usersTable.email, input.email)
        )
      )
      .limit(1)
      .execute();

    if (existingUser.length > 0) {
      const existing = existingUser[0];
      if (existing.username === input.username) {
        throw new Error('Username already exists');
      }
      if (existing.email === input.email) {
        throw new Error('Email already exists');
      }
    }

    // Hash the password (using Bun's built-in password hashing)
    const hashedPassword = await Bun.password.hash(input.password);

    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash: hashedPassword,
        full_name: input.full_name,
        role: input.role || 'employee'
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      ...user,
      role: user.role as 'admin' | 'employee' // Type assertion for enum
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};
