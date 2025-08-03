
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, ordersTable } from '../db/schema';
import { type UpdateOrderInput } from '../schema';
import { updateOrder } from '../handlers/orders_update';
import { eq } from 'drizzle-orm';

describe('updateOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update order status', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@example.com'
      })
      .returning()
      .execute();

    const order = await db.insert(ordersTable)
      .values({
        customer_id: customer[0].id,
        user_id: user[0].id,
        order_number: 'ORD-001',
        total_amount: '100.00',
        status: 'pending'
      })
      .returning()
      .execute();

    const updateInput: UpdateOrderInput = {
      id: order[0].id,
      status: 'confirmed'
    };

    const result = await updateOrder(updateInput);

    expect(result.id).toEqual(order[0].id);
    expect(result.status).toEqual('confirmed');
    expect(result.customer_id).toEqual(customer[0].id);
    expect(result.user_id).toEqual(user[0].id);
    expect(result.order_number).toEqual('ORD-001');
    expect(result.total_amount).toEqual(100);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update discount and tax amounts', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@example.com'
      })
      .returning()
      .execute();

    const order = await db.insert(ordersTable)
      .values({
        customer_id: customer[0].id,
        user_id: user[0].id,
        order_number: 'ORD-002',
        total_amount: '200.00'
      })
      .returning()
      .execute();

    const updateInput: UpdateOrderInput = {
      id: order[0].id,
      discount_amount: 25.50,
      tax_amount: 18.75,
      notes: 'Updated with discount and tax'
    };

    const result = await updateOrder(updateInput);

    expect(result.discount_amount).toEqual(25.50);
    expect(result.tax_amount).toEqual(18.75);
    expect(result.notes).toEqual('Updated with discount and tax');
    expect(typeof result.discount_amount).toBe('number');
    expect(typeof result.tax_amount).toBe('number');
  });

  it('should save updates to database', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@example.com'
      })
      .returning()
      .execute();

    const order = await db.insert(ordersTable)
      .values({
        customer_id: customer[0].id,
        user_id: user[0].id,
        order_number: 'ORD-003',
        total_amount: '150.00',
        status: 'pending'
      })
      .returning()
      .execute();

    const updateInput: UpdateOrderInput = {
      id: order[0].id,
      status: 'shipped',
      discount_amount: 10.00,
      notes: 'Order shipped today'
    };

    await updateOrder(updateInput);

    // Verify changes in database
    const updatedOrders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, order[0].id))
      .execute();

    expect(updatedOrders).toHaveLength(1);
    const updatedOrder = updatedOrders[0];
    expect(updatedOrder.status).toEqual('shipped');
    expect(parseFloat(updatedOrder.discount_amount)).toEqual(10.00);
    expect(updatedOrder.notes).toEqual('Order shipped today');
    expect(updatedOrder.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent order', async () => {
    const updateInput: UpdateOrderInput = {
      id: 99999,
      status: 'confirmed'
    };

    await expect(updateOrder(updateInput)).rejects.toThrow(/Order with id 99999 not found/i);
  });

  it('should update only provided fields', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@example.com'
      })
      .returning()
      .execute();

    const order = await db.insert(ordersTable)
      .values({
        customer_id: customer[0].id,
        user_id: user[0].id,
        order_number: 'ORD-004',
        total_amount: '300.00',
        discount_amount: '50.00',
        tax_amount: '25.00',
        notes: 'Original notes',
        status: 'pending'
      })
      .returning()
      .execute();

    // Update only status
    const updateInput: UpdateOrderInput = {
      id: order[0].id,
      status: 'delivered'
    };

    const result = await updateOrder(updateInput);

    // Status should be updated, other fields should remain unchanged
    expect(result.status).toEqual('delivered');
    expect(result.discount_amount).toEqual(50.00);
    expect(result.tax_amount).toEqual(25.00);
    expect(result.notes).toEqual('Original notes');
    expect(result.total_amount).toEqual(300.00);
  });
});
