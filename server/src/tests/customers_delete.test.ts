
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, ordersTable, usersTable } from '../db/schema';
import { deleteCustomer } from '../handlers/customers_delete';
import { eq } from 'drizzle-orm';

describe('deleteCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a customer successfully', async () => {
    // Create a test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890',
        address: '123 Test St',
        city: 'Test City'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Delete the customer
    const result = await deleteCustomer(customerId);

    expect(result.success).toBe(true);

    // Verify customer was deleted
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(0);
  });

  it('should throw error when customer does not exist', async () => {
    const nonExistentId = 999;

    await expect(() => deleteCustomer(nonExistentId))
      .toThrow(/customer not found/i);
  });

  it('should prevent deletion when customer has existing orders', async () => {
    // Create a test user first (required for orders)
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'employee'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Customer with Orders',
        email: 'customer@example.com',
        phone: '1234567890',
        address: '123 Test St',
        city: 'Test City'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create an order for this customer
    await db.insert(ordersTable)
      .values({
        customer_id: customerId,
        user_id: userId,
        order_number: 'ORD-001',
        status: 'pending',
        total_amount: '100.00',
        discount_amount: '0.00',
        tax_amount: '0.00'
      })
      .execute();

    // Attempt to delete customer should fail
    await expect(() => deleteCustomer(customerId))
      .toThrow(/cannot delete customer with existing orders/i);

    // Verify customer still exists
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toBe('Customer with Orders');
  });

  it('should handle database constraint violations gracefully', async () => {
    // Create a test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // First deletion should succeed
    const result = await deleteCustomer(customerId);
    expect(result.success).toBe(true);

    // Second deletion should fail gracefully
    await expect(() => deleteCustomer(customerId))
      .toThrow(/customer not found/i);
  });
});
