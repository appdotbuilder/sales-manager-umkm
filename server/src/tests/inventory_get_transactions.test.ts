
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, inventoryTransactionsTable } from '../db/schema';
import { getInventoryTransactions } from '../handlers/inventory_get_transactions';

describe('getInventoryTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all inventory transactions when no product filter is provided', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // Create test products
    const [product1] = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        sku: 'SKU001',
        price: '10.00',
        cost_price: '5.00',
        stock_quantity: 100,
        min_stock_level: 10
      })
      .returning()
      .execute();

    const [product2] = await db.insert(productsTable)
      .values({
        name: 'Product 2', 
        sku: 'SKU002',
        price: '20.00',
        cost_price: '10.00',
        stock_quantity: 50,
        min_stock_level: 5
      })
      .returning()
      .execute();

    // Create inventory transactions
    await db.insert(inventoryTransactionsTable)
      .values([
        {
          product_id: product1.id,
          transaction_type: 'purchase',
          quantity: 100,
          notes: 'Initial stock',
          created_by: user.id
        },
        {
          product_id: product2.id,
          transaction_type: 'purchase',
          quantity: 50,
          notes: 'Initial stock',
          created_by: user.id
        },
        {
          product_id: product1.id,
          transaction_type: 'sale',
          quantity: -10,
          notes: 'Sale transaction',
          created_by: user.id
        }
      ])
      .execute();

    const result = await getInventoryTransactions();

    expect(result).toHaveLength(3);
    expect(result[0].product_id).toBeDefined();
    expect(result[0].transaction_type).toMatch(/purchase|sale|adjustment|return/);
    expect(result[0].quantity).toBeTypeOf('number');
    expect(result[0].created_by).toEqual(user.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter transactions by product ID when provided', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // Create test products
    const [product1] = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        sku: 'SKU001',
        price: '10.00',
        cost_price: '5.00',
        stock_quantity: 100,
        min_stock_level: 10
      })
      .returning()
      .execute();

    const [product2] = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        sku: 'SKU002', 
        price: '20.00',
        cost_price: '10.00',
        stock_quantity: 50,
        min_stock_level: 5
      })
      .returning()
      .execute();

    // Create inventory transactions for both products
    await db.insert(inventoryTransactionsTable)
      .values([
        {
          product_id: product1.id,
          transaction_type: 'purchase',
          quantity: 100,
          notes: 'Product 1 purchase',
          created_by: user.id
        },
        {
          product_id: product2.id,
          transaction_type: 'purchase', 
          quantity: 50,
          notes: 'Product 2 purchase',
          created_by: user.id
        },
        {
          product_id: product1.id,
          transaction_type: 'adjustment',
          quantity: -5,
          notes: 'Product 1 adjustment',
          created_by: user.id
        }
      ])
      .execute();

    const result = await getInventoryTransactions(product1.id);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.product_id).toEqual(product1.id);
    });
    expect(result[0].notes).toMatch(/Product 1/);
    expect(result[1].notes).toMatch(/Product 1/);
  });

  it('should return empty array when no transactions exist for given product', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // Create test product
    const [product] = await db.insert(productsTable)
      .values({
        name: 'Product',
        sku: 'SKU001',
        price: '10.00',
        cost_price: '5.00',
        stock_quantity: 100,
        min_stock_level: 10
      })
      .returning()
      .execute();

    const result = await getInventoryTransactions(product.id);

    expect(result).toHaveLength(0);
  });

  it('should return transactions ordered by created_at descending', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // Create test product
    const [product] = await db.insert(productsTable)
      .values({
        name: 'Product',
        sku: 'SKU001',
        price: '10.00',
        cost_price: '5.00',
        stock_quantity: 100,
        min_stock_level: 10
      })
      .returning()
      .execute();

    // Create transactions with slight delays to ensure different timestamps
    await db.insert(inventoryTransactionsTable)
      .values({
        product_id: product.id,
        transaction_type: 'purchase',
        quantity: 100,
        notes: 'First transaction',
        created_by: user.id
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(inventoryTransactionsTable)
      .values({
        product_id: product.id,
        transaction_type: 'sale',
        quantity: -10,
        notes: 'Second transaction',
        created_by: user.id
      })
      .execute();

    const result = await getInventoryTransactions(product.id);

    expect(result).toHaveLength(2);
    // Most recent transaction should be first (descending order)
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(result[1].created_at.getTime());
    expect(result[0].notes).toEqual('Second transaction');
    expect(result[1].notes).toEqual('First transaction');
  });
});
