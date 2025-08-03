
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const updateProduct = async (input: UpdateProductInput): Promise<Product> => {
  try {
    // Check if product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.id))
      .limit(1)
      .execute();

    if (existingProduct.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    // Check SKU uniqueness if SKU is being updated
    if (input.sku) {
      const existingSKU = await db.select()
        .from(productsTable)
        .where(eq(productsTable.sku, input.sku))
        .limit(1)
        .execute();

      if (existingSKU.length > 0 && existingSKU[0].id !== input.id) {
        throw new Error(`Product with SKU '${input.sku}' already exists`);
      }
    }

    // Build update values, converting numeric fields to strings
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) updateValues.name = input.name;
    if (input.description !== undefined) updateValues.description = input.description;
    if (input.sku !== undefined) updateValues.sku = input.sku;
    if (input.price !== undefined) updateValues.price = input.price.toString();
    if (input.cost_price !== undefined) updateValues.cost_price = input.cost_price.toString();
    if (input.stock_quantity !== undefined) updateValues.stock_quantity = input.stock_quantity;
    if (input.min_stock_level !== undefined) updateValues.min_stock_level = input.min_stock_level;
    if (input.category !== undefined) updateValues.category = input.category;
    if (input.is_active !== undefined) updateValues.is_active = input.is_active;

    // Update product record
    const result = await db.update(productsTable)
      .set(updateValues)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price),
      cost_price: parseFloat(product.cost_price)
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
};
