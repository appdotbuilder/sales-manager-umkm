
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getLowStockProducts } from '../handlers/inventory_get_low_stock';

describe('getLowStockProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return products with low stock', async () => {
    // Create test products - one with low stock, one with sufficient stock
    const lowStockProduct: CreateProductInput = {
      name: 'Low Stock Product',
      description: 'Product with low stock',
      sku: 'LOW001',
      price: 10.99,
      cost_price: 5.50,
      stock_quantity: 2,
      min_stock_level: 5,
      category: 'Electronics',
      is_active: true
    };

    const sufficientStockProduct: CreateProductInput = {
      name: 'Sufficient Stock Product',
      description: 'Product with sufficient stock',
      sku: 'SUF001',
      price: 15.99,
      cost_price: 8.00,
      stock_quantity: 10,
      min_stock_level: 5,
      category: 'Electronics',
      is_active: true
    };

    // Insert both products
    await db.insert(productsTable).values([
      {
        ...lowStockProduct,
        price: lowStockProduct.price.toString(),
        cost_price: lowStockProduct.cost_price.toString()
      },
      {
        ...sufficientStockProduct,
        price: sufficientStockProduct.price.toString(),
        cost_price: sufficientStockProduct.cost_price.toString()
      }
    ]).execute();

    const result = await getLowStockProducts();

    // Should only return the low stock product
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Low Stock Product');
    expect(result[0].stock_quantity).toEqual(2);
    expect(result[0].min_stock_level).toEqual(5);
    expect(result[0].price).toEqual(10.99);
    expect(result[0].cost_price).toEqual(5.50);
    expect(typeof result[0].price).toEqual('number');
    expect(typeof result[0].cost_price).toEqual('number');
  });

  it('should return products where stock equals min stock level', async () => {
    // Create product where stock_quantity = min_stock_level
    const equalStockProduct: CreateProductInput = {
      name: 'Equal Stock Product',
      description: 'Product at minimum stock level',
      sku: 'EQL001',
      price: 12.50,
      cost_price: 6.25,
      stock_quantity: 5,
      min_stock_level: 5,
      category: 'Books',
      is_active: true
    };

    await db.insert(productsTable).values({
      ...equalStockProduct,
      price: equalStockProduct.price.toString(),
      cost_price: equalStockProduct.cost_price.toString()
    }).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Equal Stock Product');
    expect(result[0].stock_quantity).toEqual(5);
    expect(result[0].min_stock_level).toEqual(5);
  });

  it('should return empty array when no products have low stock', async () => {
    // Create product with sufficient stock
    const sufficientStockProduct: CreateProductInput = {
      name: 'High Stock Product',
      description: 'Product with high stock',
      sku: 'HIGH001',
      price: 20.00,
      cost_price: 10.00,
      stock_quantity: 20,
      min_stock_level: 5,
      category: 'Clothing',
      is_active: true
    };

    await db.insert(productsTable).values({
      ...sufficientStockProduct,
      price: sufficientStockProduct.price.toString(),
      cost_price: sufficientStockProduct.cost_price.toString()
    }).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(0);
  });

  it('should return multiple low stock products', async () => {
    // Create multiple low stock products
    const products: CreateProductInput[] = [
      {
        name: 'Low Stock A',
        description: 'First low stock product',
        sku: 'LSA001',
        price: 5.99,
        cost_price: 3.00,
        stock_quantity: 1,
        min_stock_level: 3,
        category: 'Office',
        is_active: true
      },
      {
        name: 'Low Stock B',
        description: 'Second low stock product',
        sku: 'LSB001',
        price: 8.50,
        cost_price: 4.25,
        stock_quantity: 0,
        min_stock_level: 2,
        category: 'Home',
        is_active: true
      }
    ];

    await db.insert(productsTable).values(
      products.map(product => ({
        ...product,
        price: product.price.toString(),
        cost_price: product.cost_price.toString()
      }))
    ).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(2);
    
    const productNames = result.map(p => p.name).sort();
    expect(productNames).toEqual(['Low Stock A', 'Low Stock B']);
    
    // Verify all returned products have low stock
    result.forEach(product => {
      expect(product.stock_quantity).toBeLessThanOrEqual(product.min_stock_level);
      expect(typeof product.price).toEqual('number');
      expect(typeof product.cost_price).toEqual('number');
    });
  });
});
