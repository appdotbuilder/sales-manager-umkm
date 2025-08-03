
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { getAllCustomers } from '../handlers/customers_get_all';

describe('getAllCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const result = await getAllCustomers();
    expect(result).toEqual([]);
  });

  it('should return all customers from database', async () => {
    // Create test customers
    await db.insert(customersTable)
      .values([
        {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-0101',
          address: '123 Main St',
          city: 'New York'
        },
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '555-0102',
          address: '456 Oak Ave',
          city: 'Los Angeles'
        },
        {
          name: 'Bob Johnson',
          email: null,
          phone: null,
          address: null,
          city: null
        }
      ])
      .execute();

    const result = await getAllCustomers();

    expect(result).toHaveLength(3);
    
    // Check first customer
    expect(result[0].name).toEqual('John Doe');
    expect(result[0].email).toEqual('john@example.com');
    expect(result[0].phone).toEqual('555-0101');
    expect(result[0].address).toEqual('123 Main St');
    expect(result[0].city).toEqual('New York');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Check second customer
    expect(result[1].name).toEqual('Jane Smith');
    expect(result[1].email).toEqual('jane@example.com');

    // Check third customer with null values
    expect(result[2].name).toEqual('Bob Johnson');
    expect(result[2].email).toBeNull();
    expect(result[2].phone).toBeNull();
    expect(result[2].address).toBeNull();
    expect(result[2].city).toBeNull();
  });

  it('should return customers ordered by creation date', async () => {
    // Create customers with slight delay to ensure different timestamps
    await db.insert(customersTable)
      .values({ name: 'First Customer', email: 'first@example.com', phone: null, address: null, city: null })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(customersTable)
      .values({ name: 'Second Customer', email: 'second@example.com', phone: null, address: null, city: null })
      .execute();

    const result = await getAllCustomers();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('First Customer');
    expect(result[1].name).toEqual('Second Customer');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });
});
