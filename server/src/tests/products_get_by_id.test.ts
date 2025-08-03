
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getProductById } from '../handlers/products_get_by_id';

describe('getProductById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a product when found', async () => {
    // Create a test product
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        sku: 'TEST-001',
        price: '19.99',
        cost_price: '10.50',
        stock_quantity: 100,
        min_stock_level: 10,
        category: 'Electronics',
        is_active: true
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    // Fetch the product by ID
    const result = await getProductById(createdProduct.id);

    // Verify the product is returned correctly
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdProduct.id);
    expect(result!.name).toEqual('Test Product');
    expect(result!.description).toEqual('A product for testing');
    expect(result!.sku).toEqual('TEST-001');
    expect(result!.price).toEqual(19.99);
    expect(result!.cost_price).toEqual(10.50);
    expect(result!.stock_quantity).toEqual(100);
    expect(result!.min_stock_level).toEqual(10);
    expect(result!.category).toEqual('Electronics');
    expect(result!.is_active).toEqual(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify numeric types are correctly converted
    expect(typeof result!.price).toBe('number');
    expect(typeof result!.cost_price).toBe('number');
  });

  it('should return null when product not found', async () => {
    const result = await getProductById(999);
    expect(result).toBeNull();
  });

  it('should handle inactive products', async () => {
    // Create an inactive product
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Inactive Product',
        description: 'An inactive product',
        sku: 'INACTIVE-001',
        price: '29.99',
        cost_price: '15.00',
        stock_quantity: 0,
        min_stock_level: 5,
        category: 'Discontinued',
        is_active: false
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    // Should still return the product even if inactive
    const result = await getProductById(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.is_active).toEqual(false);
    expect(result!.name).toEqual('Inactive Product');
  });
});
