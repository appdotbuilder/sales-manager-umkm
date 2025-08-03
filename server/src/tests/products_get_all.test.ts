
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getAllProducts } from '../handlers/products_get_all';

// Test product data
const testProducts: CreateProductInput[] = [
  {
    name: 'Active Product 1',
    description: 'Test product 1',
    sku: 'SKU001',
    price: 19.99,
    cost_price: 10.50,
    stock_quantity: 100,
    min_stock_level: 10,
    category: 'Electronics',
    is_active: true
  },
  {
    name: 'Inactive Product',
    description: 'Test product 2',
    sku: 'SKU002',
    price: 29.99,
    cost_price: 15.00,
    stock_quantity: 50,
    min_stock_level: 20,
    category: 'Electronics',
    is_active: false
  },
  {
    name: 'Low Stock Product',
    description: 'Test product 3',
    sku: 'SKU003',
    price: 39.99,
    cost_price: 20.00,
    stock_quantity: 5,
    min_stock_level: 10,
    category: 'Books',
    is_active: true
  },
  {
    name: 'Clothing Product',
    description: 'Test product 4',
    sku: 'SKU004',
    price: 49.99,
    cost_price: 25.00,
    stock_quantity: 75,
    min_stock_level: 15,
    category: 'Clothing',
    is_active: true
  }
];

describe('getAllProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all products with no filters', async () => {
    // Insert test products
    for (const productData of testProducts) {
      await db.insert(productsTable).values({
        ...productData,
        price: productData.price.toString(),
        cost_price: productData.cost_price.toString()
      }).execute();
    }

    const result = await getAllProducts();

    expect(result).toHaveLength(4);
    
    // Verify numeric conversions
    result.forEach(product => {
      expect(typeof product.price).toBe('number');
      expect(typeof product.cost_price).toBe('number');
      expect(product.id).toBeDefined();
      expect(product.created_at).toBeInstanceOf(Date);
      expect(product.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should filter products by category', async () => {
    // Insert test products
    for (const productData of testProducts) {
      await db.insert(productsTable).values({
        ...productData,
        price: productData.price.toString(),
        cost_price: productData.cost_price.toString()
      }).execute();
    }

    const result = await getAllProducts({ category: 'Electronics' });

    expect(result).toHaveLength(2);
    result.forEach(product => {
      expect(product.category).toBe('Electronics');
    });
  });

  it('should filter products by active status', async () => {
    // Insert test products
    for (const productData of testProducts) {
      await db.insert(productsTable).values({
        ...productData,
        price: productData.price.toString(),
        cost_price: productData.cost_price.toString()
      }).execute();
    }

    const activeResult = await getAllProducts({ is_active: true });
    expect(activeResult).toHaveLength(3);
    activeResult.forEach(product => {
      expect(product.is_active).toBe(true);
    });

    const inactiveResult = await getAllProducts({ is_active: false });
    expect(inactiveResult).toHaveLength(1);
    expect(inactiveResult[0].is_active).toBe(false);
  });

  it('should filter products with low stock alert', async () => {
    // Insert test products
    for (const productData of testProducts) {
      await db.insert(productsTable).values({
        ...productData,
        price: productData.price.toString(),
        cost_price: productData.cost_price.toString()
      }).execute();
    }

    const result = await getAllProducts({ low_stock_alert: true });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Low Stock Product');
    expect(result[0].stock_quantity).toBeLessThanOrEqual(result[0].min_stock_level);
  });

  it('should handle multiple filters', async () => {
    // Insert test products
    for (const productData of testProducts) {
      await db.insert(productsTable).values({
        ...productData,
        price: productData.price.toString(),
        cost_price: productData.cost_price.toString()
      }).execute();
    }

    const result = await getAllProducts({ 
      category: 'Electronics', 
      is_active: true 
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Active Product 1');
    expect(result[0].category).toBe('Electronics');
    expect(result[0].is_active).toBe(true);
  });

  it('should return empty array when no products match filters', async () => {
    // Insert test products
    for (const productData of testProducts) {
      await db.insert(productsTable).values({
        ...productData,
        price: productData.price.toString(),
        cost_price: productData.cost_price.toString()
      }).execute();
    }

    const result = await getAllProducts({ category: 'NonExistent' });

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no products exist', async () => {
    const result = await getAllProducts();

    expect(result).toHaveLength(0);
  });
});
