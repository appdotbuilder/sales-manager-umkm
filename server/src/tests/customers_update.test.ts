
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type UpdateCustomerInput, type CreateCustomerInput } from '../schema';
import { updateCustomer } from '../handlers/customers_update';
import { eq } from 'drizzle-orm';

// Test data
const testCustomerData: CreateCustomerInput = {
  name: 'Original Customer',
  email: 'original@example.com',
  phone: '555-0001',
  address: '123 Original St',
  city: 'Original City'
};

const partialUpdateInput: UpdateCustomerInput = {
  id: 1, // Will be set dynamically
  name: 'Updated Customer'
};

const fullUpdateInput: UpdateCustomerInput = {
  id: 1, // Will be set dynamically
  name: 'Fully Updated Customer',
  email: 'updated@example.com',
  phone: '555-9999',
  address: '999 Updated Ave',
  city: 'Updated City'
};

describe('updateCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update customer with partial data', async () => {
    // Create initial customer
    const createdCustomer = await db.insert(customersTable)
      .values(testCustomerData)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;
    const updateInput = { ...partialUpdateInput, id: customerId };

    const result = await updateCustomer(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Updated Customer');
    expect(result.email).toEqual(testCustomerData.email); // Should remain unchanged
    expect(result.phone).toEqual(testCustomerData.phone); // Should remain unchanged
    expect(result.address).toEqual(testCustomerData.address); // Should remain unchanged
    expect(result.city).toEqual(testCustomerData.city); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update all customer fields when provided', async () => {
    // Create initial customer
    const createdCustomer = await db.insert(customersTable)
      .values(testCustomerData)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;
    const updateInput = { ...fullUpdateInput, id: customerId };

    const result = await updateCustomer(updateInput);

    // Verify all fields are updated
    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Fully Updated Customer');
    expect(result.email).toEqual('updated@example.com');
    expect(result.phone).toEqual('555-9999');
    expect(result.address).toEqual('999 Updated Ave');
    expect(result.city).toEqual('Updated City');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update customer in database', async () => {
    // Create initial customer
    const createdCustomer = await db.insert(customersTable)
      .values(testCustomerData)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;
    const updateInput = { ...fullUpdateInput, id: customerId };

    await updateCustomer(updateInput);

    // Verify database was updated
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('Fully Updated Customer');
    expect(customers[0].email).toEqual('updated@example.com');
    expect(customers[0].phone).toEqual('555-9999');
    expect(customers[0].address).toEqual('999 Updated Ave');
    expect(customers[0].city).toEqual('Updated City');
    expect(customers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle nullable fields correctly', async () => {
    // Create initial customer
    const createdCustomer = await db.insert(customersTable)
      .values(testCustomerData)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      email: null,
      phone: null,
      address: null,
      city: null
    };

    const result = await updateCustomer(updateInput);

    // Verify nullable fields are set to null
    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual(testCustomerData.name); // Should remain unchanged
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.city).toBeNull();
  });

  it('should throw error when customer does not exist', async () => {
    const updateInput: UpdateCustomerInput = {
      id: 999, // Non-existent ID
      name: 'Updated Customer'
    };

    await expect(updateCustomer(updateInput)).rejects.toThrow(/Customer with id 999 not found/i);
  });

  it('should update only updated_at when no other fields provided', async () => {
    // Create initial customer
    const createdCustomer = await db.insert(customersTable)
      .values(testCustomerData)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;
    const originalUpdatedAt = createdCustomer[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateCustomerInput = {
      id: customerId
    };

    const result = await updateCustomer(updateInput);

    // Verify only updated_at changed
    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual(testCustomerData.name);
    expect(result.email).toEqual(testCustomerData.email);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
