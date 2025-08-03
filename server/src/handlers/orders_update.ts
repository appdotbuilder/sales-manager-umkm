
import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type UpdateOrderInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

export const updateOrder = async (input: UpdateOrderInput): Promise<Order> => {
  try {
    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };

    if (input.status !== undefined) {
      updateData['status'] = input.status;
    }

    if (input.discount_amount !== undefined) {
      updateData['discount_amount'] = input.discount_amount.toString();
    }

    if (input.tax_amount !== undefined) {
      updateData['tax_amount'] = input.tax_amount.toString();
    }

    if (input.notes !== undefined) {
      updateData['notes'] = input.notes;
    }

    // Update order record
    const result = await db.update(ordersTable)
      .set(updateData)
      .where(eq(ordersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Order with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const order = result[0];
    return {
      ...order,
      total_amount: parseFloat(order.total_amount),
      discount_amount: parseFloat(order.discount_amount),
      tax_amount: parseFloat(order.tax_amount)
    };
  } catch (error) {
    console.error('Order update failed:', error);
    throw error;
  }
};
