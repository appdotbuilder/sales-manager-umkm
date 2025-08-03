
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, usersTable, productsTable, ordersTable, orderItemsTable, inventoryTransactionsTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/orders_create';
import { eq } from 'drizzle-orm';

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCustomerId: number;
  let testUserId: number;
  let testProduct1Id: number;
  let testProduct2Id: number;

  beforeEach(async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '555-0123',
        address: '123 Test St',
        city: 'Test City'
      })
      .returning()
      .execute();
    testCustomerId = customerResult[0].id;

    // Create test user
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
    testUserId = userResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 1',
        description: 'First test product',
        sku: 'TEST-001',
        price: '19.99',
        cost_price: '10.00',
        stock_quantity: 100,
        min_stock_level: 10,
        category: 'Test Category'
      })
      .returning()
      .execute();
    testProduct1Id = product1Result[0].id;

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 2',
        description: 'Second test product',
        sku: 'TEST-002',
        price: '29.99',
        cost_price: '15.00',
        stock_quantity: 50,
        min_stock_level: 5,
        category: 'Test Category'
      })
      .returning()
      .execute();
    testProduct2Id = product2Result[0].id;
  });

  const testOrderInput: CreateOrderInput = {
    customer_id: 0, // Will be set in tests
    items: [
      {
        product_id: 0, // Will be set in tests
        quantity: 2,
        unit_price: 19.99
      },
      {
        product_id: 0, // Will be set in tests
        quantity: 1,
        unit_price: 29.99
      }
    ],
    discount_amount: 5.00,
    tax_amount: 6.50,
    notes: 'Test order notes'
  };

  it('should create an order with items', async () => {
    const input = {
      ...testOrderInput,
      customer_id: testCustomerId,
      items: [
        { ...testOrderInput.items[0], product_id: testProduct1Id },
        { ...testOrderInput.items[1], product_id: testProduct2Id }
      ]
    };

    const result = await createOrder(input, testUserId);

    // Verify order fields
    expect(result.customer_id).toEqual(testCustomerId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.order_number).toMatch(/^ORD-\d{3}$/);
    expect(result.status).toEqual('pending');
    expect(result.total_amount).toEqual(71.47); // (2*19.99 + 1*29.99) + 6.50 - 5.00 = 69.97 + 6.50 - 5.00 = 71.47
    expect(result.discount_amount).toEqual(5.00);
    expect(result.tax_amount).toEqual(6.50);
    expect(result.notes).toEqual('Test order notes');
    expect(result.id).toBeDefined();
    expect(result.order_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save order to database', async () => {
    const input = {
      ...testOrderInput,
      customer_id: testCustomerId,
      items: [
        { ...testOrderInput.items[0], product_id: testProduct1Id }
      ]
    };

    const result = await createOrder(input, testUserId);

    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].customer_id).toEqual(testCustomerId);
    expect(orders[0].order_number).toEqual(result.order_number);
    expect(parseFloat(orders[0].total_amount)).toEqual(result.total_amount);
  });

  it('should create order items in database', async () => {
    const input = {
      ...testOrderInput,
      customer_id: testCustomerId,
      items: [
        { ...testOrderInput.items[0], product_id: testProduct1Id },
        { ...testOrderInput.items[1], product_id: testProduct2Id }
      ]
    };

    const result = await createOrder(input, testUserId);

    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result.id))
      .execute();

    expect(orderItems).toHaveLength(2);
    
    // Verify first item
    const item1 = orderItems.find(item => item.product_id === testProduct1Id);
    expect(item1).toBeDefined();
    expect(item1!.quantity).toEqual(2);
    expect(parseFloat(item1!.unit_price)).toEqual(19.99);
    expect(parseFloat(item1!.total_price)).toEqual(39.98);

    // Verify second item
    const item2 = orderItems.find(item => item.product_id === testProduct2Id);
    expect(item2).toBeDefined();
    expect(item2!.quantity).toEqual(1);
    expect(parseFloat(item2!.unit_price)).toEqual(29.99);
    expect(parseFloat(item2!.total_price)).toEqual(29.99);
  });

  it('should update product stock quantities', async () => {
    const input = {
      ...testOrderInput,
      customer_id: testCustomerId,
      items: [
        { ...testOrderInput.items[0], product_id: testProduct1Id, quantity: 5 },
        { ...testOrderInput.items[1], product_id: testProduct2Id, quantity: 3 }
      ]
    };

    await createOrder(input, testUserId);

    // Check product 1 stock (was 100, sold 5)
    const product1 = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProduct1Id))
      .execute();
    expect(product1[0].stock_quantity).toEqual(95);

    // Check product 2 stock (was 50, sold 3)
    const product2 = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProduct2Id))
      .execute();
    expect(product2[0].stock_quantity).toEqual(47);
  });

  it('should create inventory transactions', async () => {
    const input = {
      ...testOrderInput,
      customer_id: testCustomerId,
      items: [
        { ...testOrderInput.items[0], product_id: testProduct1Id, quantity: 2 }
      ]
    };

    const result = await createOrder(input, testUserId);

    const transactions = await db.select()
      .from(inventoryTransactionsTable)
      .where(eq(inventoryTransactionsTable.reference_id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].product_id).toEqual(testProduct1Id);
    expect(transactions[0].transaction_type).toEqual('sale');
    expect(transactions[0].quantity).toEqual(-2); // Negative for sale
    expect(transactions[0].reference_type).toEqual('order');
    expect(transactions[0].created_by).toEqual(testUserId);
  });

  it('should generate unique order numbers', async () => {
    const input = {
      ...testOrderInput,
      customer_id: testCustomerId,
      items: [{ ...testOrderInput.items[0], product_id: testProduct1Id }]
    };

    const order1 = await createOrder(input, testUserId);
    const order2 = await createOrder(input, testUserId);

    expect(order1.order_number).toMatch(/^ORD-\d{3}$/);
    expect(order2.order_number).toMatch(/^ORD-\d{3}$/);
    expect(order1.order_number).not.toEqual(order2.order_number);
  });

  it('should handle orders with no discount or tax', async () => {
    const input = {
      customer_id: testCustomerId,
      items: [{ product_id: testProduct1Id, quantity: 1, unit_price: 19.99 }]
    };

    const result = await createOrder(input, testUserId);

    expect(result.total_amount).toEqual(19.99);
    expect(result.discount_amount).toEqual(0);
    expect(result.tax_amount).toEqual(0);
    expect(result.notes).toBeNull();
  });

  it('should throw error for non-existent customer', async () => {
    const input = {
      ...testOrderInput,
      customer_id: 99999,
      items: [{ ...testOrderInput.items[0], product_id: testProduct1Id }]
    };

    expect(() => createOrder(input, testUserId)).toThrow(/Customer with id 99999 not found/);
  });

  it('should throw error for non-existent product', async () => {
    const input = {
      ...testOrderInput,
      customer_id: testCustomerId,
      items: [{ product_id: 99999, quantity: 1, unit_price: 19.99 }]
    };

    expect(() => createOrder(input, testUserId)).toThrow(/Product with id 99999 not found/);
  });

  it('should throw error for insufficient stock', async () => {
    const input = {
      ...testOrderInput,
      customer_id: testCustomerId,
      items: [{ product_id: testProduct1Id, quantity: 150, unit_price: 19.99 }] // Only 100 in stock
    };

    expect(() => createOrder(input, testUserId)).toThrow(/Insufficient stock for product Test Product 1/);
  });
});
