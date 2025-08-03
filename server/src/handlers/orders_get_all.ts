
import { db } from '../db';
import { ordersTable, customersTable, usersTable } from '../db/schema';
import { type Order } from '../schema';
import { eq } from 'drizzle-orm';

export async function getAllOrders(): Promise<Order[]> {
  try {
    const results = await db.select()
      .from(ordersTable)
      .innerJoin(customersTable, eq(ordersTable.customer_id, customersTable.id))
      .innerJoin(usersTable, eq(ordersTable.user_id, usersTable.id))
      .execute();

    return results.map(result => ({
      id: result.orders.id,
      customer_id: result.orders.customer_id,
      user_id: result.orders.user_id,
      order_number: result.orders.order_number,
      status: result.orders.status,
      total_amount: parseFloat(result.orders.total_amount),
      discount_amount: parseFloat(result.orders.discount_amount),
      tax_amount: parseFloat(result.orders.tax_amount),
      notes: result.orders.notes,
      order_date: result.orders.order_date,
      created_at: result.orders.created_at,
      updated_at: result.orders.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    throw error;
  }
}
