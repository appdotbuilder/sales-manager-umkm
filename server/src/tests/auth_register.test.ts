
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { registerUser } from '../handlers/auth_register';
import { eq } from 'drizzle-orm';

const testInput: RegisterInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  role: 'employee'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user', async () => {
    const result = await registerUser(testInput);

    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.role).toEqual('employee');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Password should be hashed
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].role).toEqual('employee');
    expect(users[0].is_active).toEqual(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should default role to employee when not provided', async () => {
    const inputWithoutRole: RegisterInput = {
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123',
      full_name: 'Test User 2'
    };

    const result = await registerUser(inputWithoutRole);

    expect(result.role).toEqual('employee');
  });

  it('should hash the password', async () => {
    const result = await registerUser(testInput);

    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(10);

    // Verify password can be verified with Bun's password methods
    const isValid = await Bun.password.verify('password123', result.password_hash);
    expect(isValid).toBe(true);
  });

  it('should throw error when username already exists', async () => {
    await registerUser(testInput);

    const duplicateInput: RegisterInput = {
      username: 'testuser', // Same username
      email: 'different@example.com',
      password: 'password123',
      full_name: 'Different User'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow(/username already exists/i);
  });

  it('should throw error when email already exists', async () => {
    await registerUser(testInput);

    const duplicateInput: RegisterInput = {
      username: 'differentuser',
      email: 'test@example.com', // Same email
      password: 'password123',
      full_name: 'Different User'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow(/email already exists/i);
  });

  it('should create user with admin role', async () => {
    const adminInput: RegisterInput = {
      username: 'adminuser',
      email: 'admin@example.com',
      password: 'password123',
      full_name: 'Admin User',
      role: 'admin'
    };

    const result = await registerUser(adminInput);

    expect(result.role).toEqual('admin');
  });
});
