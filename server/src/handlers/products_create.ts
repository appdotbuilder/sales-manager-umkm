
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput, type Product } from '../schema';

export const createProduct = async (input: CreateProductInput): Promise<Product> => {
  try {
    // Insert product record
    const result = await db.insert(productsTable)
      .values({
        name: input.name,
        description: input.description,
        sku: input.sku,
        price: input.price.toString(), // Convert number to string for numeric column
        cost_price: input.cost_price.toString(), // Convert number to string for numeric column
        stock_quantity: input.stock_quantity,
        min_stock_level: input.min_stock_level,
        category: input.category,
        is_active: input.is_active ?? true
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price), // Convert string back to number
      cost_price: parseFloat(product.cost_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
};
