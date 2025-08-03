
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/auth_login';

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password_123',
  full_name: 'Test User',
  role: 'employee' as const,
  is_active: true
};

const testInput: LoginInput = {
  username: 'testuser',
  password: 'password123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate valid user credentials', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser(testInput);

    // Verify user data
    expect(result.user.username).toEqual('testuser');
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.full_name).toEqual('Test User');
    expect(result.user.role).toEqual('employee');
    expect(result.user.is_active).toBe(true);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Verify token is generated
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('should reject invalid username', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const invalidInput: LoginInput = {
      username: 'nonexistent',
      password: 'password123'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should reject inactive user account', async () => {
    // Create inactive user
    await db.insert(usersTable)
      .values({
        ...testUser,
        is_active: false
      })
      .execute();

    await expect(loginUser(testInput)).rejects.toThrow(/account is deactivated/i);
  });

  it('should return admin user with correct role', async () => {
    // Create admin user
    await db.insert(usersTable)
      .values({
        ...testUser,
        username: 'admin',
        role: 'admin' as const
      })
      .execute();

    const adminInput: LoginInput = {
      username: 'admin',
      password: 'adminpass'
    };

    const result = await loginUser(adminInput);

    expect(result.user.role).toEqual('admin');
    expect(result.user.username).toEqual('admin');
    expect(result.token).toBeDefined();
  });

  it('should generate unique tokens for different logins', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Login twice
    const result1 = await loginUser(testInput);
    const result2 = await loginUser(testInput);

    // Tokens should be different (due to timestamp)
    expect(result1.token).not.toEqual(result2.token);
    expect(result1.user.id).toEqual(result2.user.id);
  });
});
