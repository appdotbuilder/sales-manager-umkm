
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type CreateProductInput } from '../schema';
import { updateProduct } from '../handlers/products_update';
import { eq } from 'drizzle-orm';

// Test input for creating initial product
const createTestProduct: CreateProductInput = {
  name: 'Test Product',
  description: 'Original description',
  sku: 'TEST123',
  price: 19.99,
  cost_price: 10.00,
  stock_quantity: 100,
  min_stock_level: 10,
  category: 'Electronics',
  is_active: true
};

// Helper function to create a test product
const createInitialProduct = async () => {
  const result = await db.insert(productsTable)
    .values({
      ...createTestProduct,
      price: createTestProduct.price.toString(),
      cost_price: createTestProduct.cost_price.toString()
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update product name', async () => {
    const initialProduct = await createInitialProduct();
    
    const updateInput: UpdateProductInput = {
      id: initialProduct.id,
      name: 'Updated Product Name'
    };

    const result = await updateProduct(updateInput);

    expect(result.name).toEqual('Updated Product Name');
    expect(result.description).toEqual('Original description');
    expect(result.sku).toEqual('TEST123');
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toEqual('number');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > initialProduct.updated_at).toBe(true);
  });

  it('should update multiple fields', async () => {
    const initialProduct = await createInitialProduct();
    
    const updateInput: UpdateProductInput = {
      id: initialProduct.id,
      name: 'Multi-Update Product',
      description: 'Updated description',
      price: 29.99,
      cost_price: 15.00,
      stock_quantity: 200,
      category: 'Updated Category',
      is_active: false
    };

    const result = await updateProduct(updateInput);

    expect(result.name).toEqual('Multi-Update Product');
    expect(result.description).toEqual('Updated description');
    expect(result.price).toEqual(29.99);
    expect(result.cost_price).toEqual(15.00);
    expect(typeof result.price).toEqual('number');
    expect(typeof result.cost_price).toEqual('number');
    expect(result.stock_quantity).toEqual(200);
    expect(result.category).toEqual('Updated Category');
    expect(result.is_active).toBe(false);
  });

  it('should save updated product to database', async () => {
    const initialProduct = await createInitialProduct();
    
    const updateInput: UpdateProductInput = {
      id: initialProduct.id,
      name: 'Database Updated Product',
      price: 39.99
    };

    await updateProduct(updateInput);

    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, initialProduct.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Database Updated Product');
    expect(parseFloat(products[0].price)).toEqual(39.99);
    expect(products[0].updated_at).toBeInstanceOf(Date);
    expect(products[0].updated_at > initialProduct.updated_at).toBe(true);
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateProductInput = {
      id: 999,
      name: 'Non-existent Product'
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/Product with id 999 not found/i);
  });

  it('should update SKU when unique', async () => {
    const initialProduct = await createInitialProduct();
    
    const updateInput: UpdateProductInput = {
      id: initialProduct.id,
      sku: 'UNIQUE123'
    };

    const result = await updateProduct(updateInput);

    expect(result.sku).toEqual('UNIQUE123');
    
    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, initialProduct.id))
      .execute();

    expect(products[0].sku).toEqual('UNIQUE123');
  });

  it('should throw error when updating to duplicate SKU', async () => {
    // Create first product
    const firstProduct = await createInitialProduct();
    
    // Create second product with different SKU
    const secondProduct = await db.insert(productsTable)
      .values({
        name: 'Second Product',
        description: 'Second description',
        sku: 'SECOND456',
        price: '25.99',
        cost_price: '12.00',
        stock_quantity: 50,
        min_stock_level: 5,
        category: 'Other',
        is_active: true
      })
      .returning()
      .execute();

    // Try to update second product with first product's SKU
    const updateInput: UpdateProductInput = {
      id: secondProduct[0].id,
      sku: 'TEST123' // This SKU already exists on first product
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/Product with SKU 'TEST123' already exists/i);
  });

  it('should allow updating product with its own SKU', async () => {
    const initialProduct = await createInitialProduct();
    
    const updateInput: UpdateProductInput = {
      id: initialProduct.id,
      name: 'Updated Name',
      sku: 'TEST123' // Same SKU as before
    };

    const result = await updateProduct(updateInput);

    expect(result.name).toEqual('Updated Name');
    expect(result.sku).toEqual('TEST123');
  });

  it('should handle nullable fields correctly', async () => {
    const initialProduct = await createInitialProduct();
    
    const updateInput: UpdateProductInput = {
      id: initialProduct.id,
      description: null,
      category: null
    };

    const result = await updateProduct(updateInput);

    expect(result.description).toBeNull();
    expect(result.category).toBeNull();
    
    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, initialProduct.id))
      .execute();

    expect(products[0].description).toBeNull();
    expect(products[0].category).toBeNull();
  });
});
