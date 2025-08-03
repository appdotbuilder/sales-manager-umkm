
import { db } from '../db';
import { productsTable, inventoryTransactionsTable } from '../db/schema';
import { type AdjustInventoryInput, type InventoryTransaction } from '../schema';
import { eq } from 'drizzle-orm';

export const adjustInventory = async (input: AdjustInventoryInput, userId: number): Promise<InventoryTransaction> => {
  try {
    // Verify product exists
    const existingProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (existingProducts.length === 0) {
      throw new Error(`Product with id ${input.product_id} not found`);
    }

    const product = existingProducts[0];
    const newStockQuantity = product.stock_quantity + input.quantity;

    // Prevent negative stock
    if (newStockQuantity < 0) {
      throw new Error('Insufficient stock quantity. Cannot reduce below zero.');
    }

    // Update product stock quantity
    await db.update(productsTable)
      .set({ 
        stock_quantity: newStockQuantity,
        updated_at: new Date()
      })
      .where(eq(productsTable.id, input.product_id))
      .execute();

    // Create inventory transaction record
    const result = await db.insert(inventoryTransactionsTable)
      .values({
        product_id: input.product_id,
        transaction_type: input.transaction_type,
        quantity: input.quantity,
        reference_id: null,
        reference_type: null,
        notes: input.notes || null,
        created_by: userId
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Inventory adjustment failed:', error);
    throw error;
  }
};
