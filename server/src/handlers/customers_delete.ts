
import { db } from '../db';
import { customersTable, ordersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteCustomer(id: number): Promise<{ success: boolean }> {
  try {
    // Check if customer exists
    const existingCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    if (existingCustomer.length === 0) {
      throw new Error('Customer not found');
    }

    // Check for existing orders - prevent deletion if orders exist
    const existingOrders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.customer_id, id))
      .execute();

    if (existingOrders.length > 0) {
      throw new Error('Cannot delete customer with existing orders');
    }

    // Delete the customer
    await db.delete(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Customer deletion failed:', error);
    throw error;
  }
}
