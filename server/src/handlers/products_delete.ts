
import { db } from '../db';
import { productsTable, orderItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteProduct(id: number): Promise<{ success: boolean }> {
  try {
    // Check if product exists in any order items first
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.product_id, id))
      .limit(1)
      .execute();

    if (orderItems.length > 0) {
      throw new Error('Cannot delete product: product is referenced in existing orders');
    }

    // Check if product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1)
      .execute();

    if (existingProduct.length === 0) {
      throw new Error('Product not found');
    }

    // Delete the product
    const result = await db.delete(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Product deletion failed:', error);
    throw error;
  }
}
