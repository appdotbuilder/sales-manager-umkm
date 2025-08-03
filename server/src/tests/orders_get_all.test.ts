
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, customersTable, usersTable } from '../db/schema';
import { getAllOrders } from '../handlers/orders_get_all';

describe('getAllOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no orders exist', async () => {
    const result = await getAllOrders();
    expect(result).toEqual([]);
  });

  it('should return all orders with proper data types', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'employee'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '555-0123'
      })
      .returning()
      .execute();

    // Create test order
    await db.insert(ordersTable)
      .values({
        customer_id: customer[0].id,
        user_id: user[0].id,
        order_number: 'ORD-001',
        status: 'pending',
        total_amount: '99.99',
        discount_amount: '5.00',
        tax_amount: '8.50',
        notes: 'Test order'
      })
      .execute();

    const result = await getAllOrders();

    expect(result).toHaveLength(1);
    
    const order = result[0];
    expect(order.id).toBeDefined();
    expect(order.customer_id).toEqual(customer[0].id);
    expect(order.user_id).toEqual(user[0].id);
    expect(order.order_number).toEqual('ORD-001');
    expect(order.status).toEqual('pending');
    expect(order.total_amount).toEqual(99.99);
    expect(typeof order.total_amount).toBe('number');
    expect(order.discount_amount).toEqual(5.00);
    expect(typeof order.discount_amount).toBe('number');
    expect(order.tax_amount).toEqual(8.5);
    expect(typeof order.tax_amount).toBe('number');
    expect(order.notes).toEqual('Test order');
    expect(order.order_date).toBeInstanceOf(Date);
    expect(order.created_at).toBeInstanceOf(Date);
    expect(order.updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple orders', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    const customer1 = await db.insert(customersTable)
      .values({
        name: 'Customer One',
        email: 'customer1@example.com'
      })
      .returning()
      .execute();

    const customer2 = await db.insert(customersTable)
      .values({
        name: 'Customer Two',
        email: 'customer2@example.com'
      })
      .returning()
      .execute();

    // Create multiple orders
    await db.insert(ordersTable)
      .values([
        {
          customer_id: customer1[0].id,
          user_id: user[0].id,
          order_number: 'ORD-001',
          status: 'pending',
          total_amount: '50.00',
          discount_amount: '0.00',
          tax_amount: '4.00'
        },
        {
          customer_id: customer2[0].id,
          user_id: user[0].id,
          order_number: 'ORD-002',
          status: 'confirmed',
          total_amount: '125.50',
          discount_amount: '10.00',
          tax_amount: '12.55'
        }
      ])
      .execute();

    const result = await getAllOrders();

    expect(result).toHaveLength(2);
    
    // Verify both orders are returned with correct data
    const orderNumbers = result.map(order => order.order_number);
    expect(orderNumbers).toContain('ORD-001');
    expect(orderNumbers).toContain('ORD-002');
    
    // Verify numeric conversions for all orders
    result.forEach(order => {
      expect(typeof order.total_amount).toBe('number');
      expect(typeof order.discount_amount).toBe('number');
      expect(typeof order.tax_amount).toBe('number');
    });
  });

  it('should handle orders with null values correctly', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'employee'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: null,
        phone: null
      })
      .returning()
      .execute();

    // Create order with null notes
    await db.insert(ordersTable)
      .values({
        customer_id: customer[0].id,
        user_id: user[0].id,
        order_number: 'ORD-NULL',
        status: 'delivered',
        total_amount: '75.25',
        discount_amount: '0.00',
        tax_amount: '6.02',
        notes: null
      })
      .execute();

    const result = await getAllOrders();

    expect(result).toHaveLength(1);
    expect(result[0].notes).toBeNull();
    expect(result[0].total_amount).toEqual(75.25);
    expect(result[0].status).toEqual('delivered');
  });
});
