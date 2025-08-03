
import { db } from '../db';
import { inventoryTransactionsTable } from '../db/schema';
import { type InventoryTransaction } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getInventoryTransactions(productId?: number): Promise<InventoryTransaction[]> {
  try {
    // Build query with conditional filtering
    const results = productId !== undefined
      ? await db.select()
          .from(inventoryTransactionsTable)
          .where(eq(inventoryTransactionsTable.product_id, productId))
          .orderBy(desc(inventoryTransactionsTable.created_at))
          .execute()
      : await db.select()
          .from(inventoryTransactionsTable)
          .orderBy(desc(inventoryTransactionsTable.created_at))
          .execute();

    // Return results - no numeric conversions needed as all fields are integers or strings
    return results;
  } catch (error) {
    console.error('Failed to fetch inventory transactions:', error);
    throw error;
  }
}
