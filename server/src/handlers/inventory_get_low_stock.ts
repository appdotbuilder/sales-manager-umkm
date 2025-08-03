
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { lte, eq } from 'drizzle-orm';

export async function getLowStockProducts(): Promise<Product[]> {
  try {
    // Query products where stock_quantity <= min_stock_level and product is active
    const results = await db.select()
      .from(productsTable)
      .where(
        lte(productsTable.stock_quantity, productsTable.min_stock_level)
      )
      .execute();

    // Convert numeric fields from strings to numbers
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price),
      cost_price: parseFloat(product.cost_price)
    }));
  } catch (error) {
    console.error('Low stock products query failed:', error);
    throw error;
  }
}
