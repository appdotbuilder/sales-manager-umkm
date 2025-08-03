
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/products_create';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateProductInput = {
  name: 'Test Product',
  description: 'A product for testing',
  sku: 'TEST-SKU-001',
  price: 19.99,
  cost_price: 12.50,
  stock_quantity: 100,
  min_stock_level: 10,
  category: 'Electronics',
  is_active: true
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product with all fields', async () => {
    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Product');
    expect(result.description).toEqual('A product for testing');
    expect(result.sku).toEqual('TEST-SKU-001');
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toBe('number');
    expect(result.cost_price).toEqual(12.50);
    expect(typeof result.cost_price).toBe('number');
    expect(result.stock_quantity).toEqual(100);
    expect(result.min_stock_level).toEqual(10);
    expect(result.category).toEqual('Electronics');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database correctly', async () => {
    const result = await createProduct(testInput);

    // Query the database to verify the product was saved
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    const savedProduct = products[0];
    expect(savedProduct.name).toEqual('Test Product');
    expect(savedProduct.sku).toEqual('TEST-SKU-001');
    expect(parseFloat(savedProduct.price)).toEqual(19.99);
    expect(parseFloat(savedProduct.cost_price)).toEqual(12.50);
    expect(savedProduct.stock_quantity).toEqual(100);
    expect(savedProduct.min_stock_level).toEqual(10);
    expect(savedProduct.category).toEqual('Electronics');
    expect(savedProduct.is_active).toBe(true);
    expect(savedProduct.created_at).toBeInstanceOf(Date);
    expect(savedProduct.updated_at).toBeInstanceOf(Date);
  });

  it('should create product with nullable fields as null', async () => {
    const inputWithNulls: CreateProductInput = {
      name: 'Minimal Product',
      description: null,
      sku: 'MIN-001',
      price: 10.00,
      cost_price: 5.00,
      stock_quantity: 0,
      min_stock_level: 0,
      category: null
    };

    const result = await createProduct(inputWithNulls);

    expect(result.name).toEqual('Minimal Product');
    expect(result.description).toBeNull();
    expect(result.category).toBeNull();
    expect(result.is_active).toBe(true); // Should default to true
    expect(result.price).toEqual(10.00);
    expect(result.cost_price).toEqual(5.00);
  });

  it('should enforce unique SKU constraint', async () => {
    // Create first product
    await createProduct(testInput);

    // Attempt to create second product with same SKU
    const duplicateInput: CreateProductInput = {
      ...testInput,
      name: 'Different Product'
    };

    expect(createProduct(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should handle decimal prices correctly', async () => {
    const decimalInput: CreateProductInput = {
      name: 'Decimal Product',
      description: 'Testing decimal precision',
      sku: 'DEC-001',
      price: 123.45,
      cost_price: 67.89,
      stock_quantity: 50,
      min_stock_level: 5,
      category: 'Test',
      is_active: true
    };

    const result = await createProduct(decimalInput);

    expect(result.price).toEqual(123.45);
    expect(result.cost_price).toEqual(67.89);
    expect(typeof result.price).toBe('number');
    expect(typeof result.cost_price).toBe('number');

    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(products[0].price)).toEqual(123.45);
    expect(parseFloat(products[0].cost_price)).toEqual(67.89);
  });
});
