
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, orderItemsTable, ordersTable, customersTable, usersTable } from '../db/schema';
import { deleteProduct } from '../handlers/products_delete';
import { eq } from 'drizzle-orm';

describe('deleteProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a product successfully', async () => {
    // Create a test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        sku: 'TEST-001',
        price: '19.99',
        cost_price: '10.00',
        stock_quantity: 100,
        min_stock_level: 10,
        category: 'Test Category',
        is_active: true
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Delete the product
    const result = await deleteProduct(productId);
    expect(result.success).toBe(true);

    // Verify product is deleted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(0);
  });

  it('should throw error when product does not exist', async () => {
    const nonExistentId = 999;

    await expect(deleteProduct(nonExistentId))
      .rejects.toThrow(/product not found/i);
  });

  it('should throw error when product is referenced in order items', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'employee'
      })
      .returning()
      .execute();

    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '123-456-7890',
        address: '123 Test St',
        city: 'Test City'
      })
      .returning()
      .execute();

    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        sku: 'TEST-001',
        price: '19.99',
        cost_price: '10.00',
        stock_quantity: 100,
        min_stock_level: 10,
        category: 'Test Category',
        is_active: true
      })
      .returning()
      .execute();

    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: customerResult[0].id,
        user_id: userResult[0].id,
        order_number: 'ORD-001',
        status: 'pending',
        total_amount: '19.99',
        discount_amount: '0',
        tax_amount: '0'
      })
      .returning()
      .execute();

    // Create order item that references the product
    await db.insert(orderItemsTable)
      .values({
        order_id: orderResult[0].id,
        product_id: productResult[0].id,
        quantity: 1,
        unit_price: '19.99',
        total_price: '19.99'
      })
      .execute();

    // Attempt to delete product should fail
    await expect(deleteProduct(productResult[0].id))
      .rejects.toThrow(/cannot delete product.*referenced in existing orders/i);

    // Verify product still exists
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productResult[0].id))
      .execute();

    expect(products).toHaveLength(1);
  });

  it('should allow deletion when no order items reference the product', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'employee'
      })
      .returning()
      .execute();

    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '123-456-7890',
        address: '123 Test St',
        city: 'Test City'
      })
      .returning()
      .execute();

    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        sku: 'TEST-001',
        price: '19.99',
        cost_price: '10.00',
        stock_quantity: 100,
        min_stock_level: 10,
        category: 'Test Category',
        is_active: true
      })
      .returning()
      .execute();

    // Create order without order items
    await db.insert(ordersTable)
      .values({
        customer_id: customerResult[0].id,
        user_id: userResult[0].id,
        order_number: 'ORD-001',
        status: 'pending',
        total_amount: '0',
        discount_amount: '0',
        tax_amount: '0'
      })
      .execute();

    // Delete should succeed since no order items reference the product
    const result = await deleteProduct(productResult[0].id);
    expect(result.success).toBe(true);

    // Verify product is deleted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productResult[0].id))
      .execute();

    expect(products).toHaveLength(0);
  });
});
