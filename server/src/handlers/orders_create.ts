
import { db } from '../db';
import { ordersTable, orderItemsTable, productsTable, customersTable, inventoryTransactionsTable } from '../db/schema';
import { type CreateOrderInput, type Order } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function createOrder(input: CreateOrderInput, userId: number): Promise<Order> {
  try {
    // Validate customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (customer.length === 0) {
      throw new Error(`Customer with id ${input.customer_id} not found`);
    }

    // Validate all products exist and have sufficient stock
    for (const item of input.items) {
      const product = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, item.product_id))
        .execute();

      if (product.length === 0) {
        throw new Error(`Product with id ${item.product_id} not found`);
      }

      if (product[0].stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${product[0].name}. Available: ${product[0].stock_quantity}, Required: ${item.quantity}`);
      }
    }

    // Generate unique order number
    const orderNumber = await generateOrderNumber();

    // Calculate total amount
    const itemsTotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discountAmount = input.discount_amount || 0;
    const taxAmount = input.tax_amount || 0;
    const totalAmount = itemsTotal + taxAmount - discountAmount;

    // Create order
    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: input.customer_id,
        user_id: userId,
        order_number: orderNumber,
        status: 'pending',
        total_amount: totalAmount.toString(),
        discount_amount: discountAmount.toString(),
        tax_amount: taxAmount.toString(),
        notes: input.notes || null
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create order items and update inventory
    for (const item of input.items) {
      const totalPrice = item.quantity * item.unit_price;

      // Create order item
      await db.insert(orderItemsTable)
        .values({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price.toString(),
          total_price: totalPrice.toString()
        })
        .execute();

      // Update product stock
      await db.update(productsTable)
        .set({
          stock_quantity: sql`stock_quantity - ${item.quantity}`,
          updated_at: sql`NOW()`
        })
        .where(eq(productsTable.id, item.product_id))
        .execute();

      // Create inventory transaction
      await db.insert(inventoryTransactionsTable)
        .values({
          product_id: item.product_id,
          transaction_type: 'sale',
          quantity: -item.quantity, // Negative for sale
          reference_id: order.id,
          reference_type: 'order',
          notes: `Sale from order ${orderNumber}`,
          created_by: userId
        })
        .execute();
    }

    // Return order with numeric conversions
    return {
      ...order,
      total_amount: parseFloat(order.total_amount),
      discount_amount: parseFloat(order.discount_amount),
      tax_amount: parseFloat(order.tax_amount)
    };

  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
}

async function generateOrderNumber(): Promise<string> {
  // Get the latest order number to generate the next one
  const latestOrder = await db.select({ order_number: ordersTable.order_number })
    .from(ordersTable)
    .orderBy(sql`id DESC`)
    .limit(1)
    .execute();

  if (latestOrder.length === 0) {
    return 'ORD-001';
  }

  // Extract number from order number format "ORD-XXX"
  const lastNumber = parseInt(latestOrder[0].order_number.split('-')[1]) || 0;
  const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
  return `ORD-${nextNumber}`;
}
