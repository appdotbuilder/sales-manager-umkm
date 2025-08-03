
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, productsTable, ordersTable, orderItemsTable } from '../db/schema';
import { getOrderById } from '../handlers/orders_get_by_id';

describe('getOrderById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent order', async () => {
    const result = await getOrderById(999);
    expect(result).toBeNull();
  });

  it('should return order with items when order exists', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'employee'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '123-456-7890'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create test products
    const productResults = await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          sku: 'SKU001',
          price: '19.99',
          cost_price: '10.00',
          stock_quantity: 100
        },
        {
          name: 'Product 2', 
          sku: 'SKU002',
          price: '29.99',
          cost_price: '15.00',
          stock_quantity: 50
        }
      ])
      .returning()
      .execute();

    const product1Id = productResults[0].id;
    const product2Id = productResults[1].id;

    // Create test order
    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: customerId,
        user_id: userId,
        order_number: 'ORD001',
        status: 'pending',
        total_amount: '79.97',
        discount_amount: '5.00',
        tax_amount: '6.40'
      })
      .returning()
      .execute();

    const orderId = orderResult[0].id;

    // Create order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: orderId,
          product_id: product1Id,
          quantity: 2,
          unit_price: '19.99',
          total_price: '39.98'
        },
        {
          order_id: orderId,
          product_id: product2Id,
          quantity: 1,
          unit_price: '29.99',
          total_price: '29.99'
        }
      ])
      .execute();

    // Test the handler
    const result = await getOrderById(orderId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(orderId);
    expect(result!.customer_id).toBe(customerId);
    expect(result!.user_id).toBe(userId);
    expect(result!.order_number).toBe('ORD001');
    expect(result!.status).toBe('pending');
    expect(result!.total_amount).toBe(79.97);
    expect(result!.discount_amount).toBe(5.00);
    expect(result!.tax_amount).toBe(6.40);
    expect(typeof result!.total_amount).toBe('number');
    expect(typeof result!.discount_amount).toBe('number');
    expect(typeof result!.tax_amount).toBe('number');

    // Check order items
    expect(result!.items).toHaveLength(2);
    
    const item1 = result!.items.find(item => item.product_id === product1Id);
    expect(item1).toBeDefined();
    expect(item1!.quantity).toBe(2);
    expect(item1!.unit_price).toBe(19.99);
    expect(item1!.total_price).toBe(39.98);
    expect(typeof item1!.unit_price).toBe('number');
    expect(typeof item1!.total_price).toBe('number');

    const item2 = result!.items.find(item => item.product_id === product2Id);
    expect(item2).toBeDefined();
    expect(item2!.quantity).toBe(1);
    expect(item2!.unit_price).toBe(29.99);
    expect(item2!.total_price).toBe(29.99);
    expect(typeof item2!.unit_price).toBe('number');
    expect(typeof item2!.total_price).toBe('number');
  });

  it('should return order even when it has no items', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'employee'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@example.com'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create test order without items
    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: customerId,
        user_id: userId,
        order_number: 'ORD002',
        status: 'pending',
        total_amount: '0.00',
        discount_amount: '0.00',
        tax_amount: '0.00'
      })
      .returning()
      .execute();

    const orderId = orderResult[0].id;

    // Test the handler
    const result = await getOrderById(orderId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(orderId);
    expect(result!.order_number).toBe('ORD002');
    expect(result!.total_amount).toBe(0);
    expect(result!.items).toHaveLength(0);
  });
});
