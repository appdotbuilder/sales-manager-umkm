
import { db } from '../db';
import { ordersTable, orderItemsTable, customersTable, productsTable } from '../db/schema';
import { type Order, type OrderItem } from '../schema';
import { eq } from 'drizzle-orm';

export async function getOrderById(id: number): Promise<(Order & { items: OrderItem[] }) | null> {
  try {
    // First, get the order with customer details
    const orderResults = await db.select()
      .from(ordersTable)
      .innerJoin(customersTable, eq(ordersTable.customer_id, customersTable.id))
      .where(eq(ordersTable.id, id))
      .execute();

    if (orderResults.length === 0) {
      return null;
    }

    const orderData = orderResults[0].orders;
    
    // Convert numeric fields to numbers for the order
    const order: Order = {
      ...orderData,
      total_amount: parseFloat(orderData.total_amount),
      discount_amount: parseFloat(orderData.discount_amount),
      tax_amount: parseFloat(orderData.tax_amount)
    };

    // Get order items with product details
    const itemResults = await db.select()
      .from(orderItemsTable)
      .innerJoin(productsTable, eq(orderItemsTable.product_id, productsTable.id))
      .where(eq(orderItemsTable.order_id, id))
      .execute();

    // Convert numeric fields to numbers for order items
    const items: OrderItem[] = itemResults.map(result => ({
      ...result.order_items,
      unit_price: parseFloat(result.order_items.unit_price),
      total_price: parseFloat(result.order_items.total_price)
    }));

    return {
      ...order,
      items
    };
  } catch (error) {
    console.error('Failed to get order by ID:', error);
    throw error;
  }
}
