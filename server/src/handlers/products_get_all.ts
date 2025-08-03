
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { eq, lte, and, type SQL } from 'drizzle-orm';

export interface GetAllProductsFilters {
  category?: string;
  is_active?: boolean;
  low_stock_alert?: boolean;
}

export async function getAllProducts(filters: GetAllProductsFilters = {}): Promise<Product[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (filters.category !== undefined) {
      conditions.push(eq(productsTable.category, filters.category));
    }

    if (filters.is_active !== undefined) {
      conditions.push(eq(productsTable.is_active, filters.is_active));
    }

    if (filters.low_stock_alert === true) {
      conditions.push(lte(productsTable.stock_quantity, productsTable.min_stock_level));
    }

    // Execute query with or without conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(productsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(productsTable)
          .execute();

    // Convert numeric fields back to numbers
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price),
      cost_price: parseFloat(product.cost_price)
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
}
