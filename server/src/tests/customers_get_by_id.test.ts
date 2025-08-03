
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { getCustomerById } from '../handlers/customers_get_by_id';

describe('getCustomerById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return customer by ID', async () => {
    // Create a test customer
    const customerData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      address: '123 Main St',
      city: 'New York'
    };

    const insertResult = await db.insert(customersTable)
      .values(customerData)
      .returning()
      .execute();

    const customerId = insertResult[0].id;

    // Test getting customer by ID
    const result = await getCustomerById(customerId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(customerId);
    expect(result!.name).toEqual('John Doe');
    expect(result!.email).toEqual('john@example.com');
    expect(result!.phone).toEqual('555-1234');
    expect(result!.address).toEqual('123 Main St');
    expect(result!.city).toEqual('New York');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent customer', async () => {
    const result = await getCustomerById(999);
    expect(result).toBeNull();
  });

  it('should handle customer with null fields', async () => {
    // Create a customer with minimal required data
    const customerData = {
      name: 'Jane Smith',
      email: null,
      phone: null,
      address: null,
      city: null
    };

    const insertResult = await db.insert(customersTable)
      .values(customerData)
      .returning()
      .execute();

    const customerId = insertResult[0].id;

    // Test getting customer by ID
    const result = await getCustomerById(customerId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(customerId);
    expect(result!.name).toEqual('Jane Smith');
    expect(result!.email).toBeNull();
    expect(result!.phone).toBeNull();
    expect(result!.address).toBeNull();
    expect(result!.city).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});
