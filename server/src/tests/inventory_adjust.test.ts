
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, usersTable, inventoryTransactionsTable } from '../db/schema';
import { type AdjustInventoryInput } from '../schema';
import { adjustInventory } from '../handlers/inventory_adjust';
import { eq } from 'drizzle-orm';

describe('adjustInventory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should adjust inventory with positive quantity', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        sku: 'TEST-001',
        price: '19.99',
        cost_price: '10.00',
        stock_quantity: 100,
        min_stock_level: 10,
        category: 'test'
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    const input: AdjustInventoryInput = {
      product_id: productId,
      quantity: 50,
      transaction_type: 'purchase',
      notes: 'Restocking inventory'
    };

    const result = await adjustInventory(input, userId);

    // Verify transaction record
    expect(result.product_id).toEqual(productId);
    expect(result.quantity).toEqual(50);
    expect(result.transaction_type).toEqual('purchase');
    expect(result.notes).toEqual('Restocking inventory');
    expect(result.created_by).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.reference_id).toBeNull();
    expect(result.reference_type).toBeNull();
  });

  it('should update product stock quantity correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test product with initial stock
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        sku: 'TEST-001',
        price: '19.99',
        cost_price: '10.00',
        stock_quantity: 100,
        min_stock_level: 10,
        category: 'test'
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    const input: AdjustInventoryInput = {
      product_id: productId,
      quantity: 25,
      transaction_type: 'adjustment',
      notes: 'Stock adjustment'
    };

    await adjustInventory(input, userId);

    // Verify product stock was updated
    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(updatedProducts).toHaveLength(1);
    expect(updatedProducts[0].stock_quantity).toEqual(125); // 100 + 25
    expect(updatedProducts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle negative quantity adjustments', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test product with sufficient stock
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        sku: 'TEST-001',
        price: '19.99',
        cost_price: '10.00',
        stock_quantity: 100,
        min_stock_level: 10,
        category: 'test'
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    const input: AdjustInventoryInput = {
      product_id: productId,
      quantity: -30,
      transaction_type: 'adjustment',
      notes: 'Stock reduction'
    };

    await adjustInventory(input, userId);

    // Verify product stock was reduced
    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(updatedProducts[0].stock_quantity).toEqual(70); // 100 - 30
  });

  it('should create inventory transaction record in database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        sku: 'TEST-001',
        price: '19.99',
        cost_price: '10.00',
        stock_quantity: 100,
        min_stock_level: 10,
        category: 'test'
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    const input: AdjustInventoryInput = {
      product_id: productId,
      quantity: 15,
      transaction_type: 'return',
      notes: 'Customer return'
    };

    const result = await adjustInventory(input, userId);

    // Verify transaction was saved to database
    const transactions = await db.select()
      .from(inventoryTransactionsTable)
      .where(eq(inventoryTransactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].product_id).toEqual(productId);
    expect(transactions[0].quantity).toEqual(15);
    expect(transactions[0].transaction_type).toEqual('return');
    expect(transactions[0].notes).toEqual('Customer return');
    expect(transactions[0].created_by).toEqual(userId);
    expect(transactions[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent product', async () => {
    const input: AdjustInventoryInput = {
      product_id: 999,
      quantity: 10,
      transaction_type: 'adjustment'
    };

    await expect(adjustInventory(input, 1)).rejects.toThrow(/product with id 999 not found/i);
  });

  it('should throw error when reducing stock below zero', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test product with low stock
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        sku: 'TEST-001',
        price: '19.99',
        cost_price: '10.00',
        stock_quantity: 10,
        min_stock_level: 5,
        category: 'test'
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    const input: AdjustInventoryInput = {
      product_id: productId,
      quantity: -15, // Trying to reduce by more than available
      transaction_type: 'adjustment',
      notes: 'Excessive reduction'
    };

    await expect(adjustInventory(input, userId)).rejects.toThrow(/insufficient stock quantity/i);
  });

  it('should handle adjustment with optional notes', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        sku: 'TEST-001',
        price: '19.99',
        cost_price: '10.00',
        stock_quantity: 100,
        min_stock_level: 10,
        category: 'test'
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    const input: AdjustInventoryInput = {
      product_id: productId,
      quantity: 5,
      transaction_type: 'adjustment'
      // notes not provided
    };

    const result = await adjustInventory(input, userId);

    expect(result.notes).toBeNull();
  });
});
