
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/customers_create';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateCustomerInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  address: '123 Main St',
  city: 'New York'
};

// Test input with nullable fields as null
const minimalInput: CreateCustomerInput = {
  name: 'Jane Smith',
  email: null,
  phone: null,
  address: null,
  city: null
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.phone).toEqual('+1234567890');
    expect(result.address).toEqual('123 Main St');
    expect(result.city).toEqual('New York');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a customer with minimal fields (nullables as null)', async () => {
    const result = await createCustomer(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.city).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInput);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('John Doe');
    expect(customers[0].email).toEqual('john.doe@example.com');
    expect(customers[0].phone).toEqual('+1234567890');
    expect(customers[0].address).toEqual('123 Main St');
    expect(customers[0].city).toEqual('New York');
    expect(customers[0].created_at).toBeInstanceOf(Date);
    expect(customers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle email uniqueness constraint', async () => {
    // Create first customer
    await createCustomer(testInput);

    // Attempt to create second customer with same email
    const duplicateInput: CreateCustomerInput = {
      name: 'Different Name',
      email: 'john.doe@example.com', // Same email
      phone: '+9876543210',
      address: '456 Other St',
      city: 'Boston'
    };

    // This should succeed since there's no unique constraint on email in the schema
    const result = await createCustomer(duplicateInput);
    expect(result.name).toEqual('Different Name');
    expect(result.email).toEqual('john.doe@example.com');
  });

  it('should auto-generate timestamps', async () => {
    const beforeCreate = new Date();
    const result = await createCustomer(testInput);
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});
