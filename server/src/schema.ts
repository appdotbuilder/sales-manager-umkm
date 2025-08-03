
import { z } from 'zod';

// User schema for authentication
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  role: z.enum(['admin', 'employee']),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Customer schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

// Product schema
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  sku: z.string(),
  price: z.number(),
  cost_price: z.number(),
  stock_quantity: z.number().int(),
  min_stock_level: z.number().int(),
  category: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Order schema
export const orderSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  user_id: z.number(),
  order_number: z.string(),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
  total_amount: z.number(),
  discount_amount: z.number(),
  tax_amount: z.number(),
  notes: z.string().nullable(),
  order_date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

// Order item schema
export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Inventory transaction schema for stock tracking
export const inventoryTransactionSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  transaction_type: z.enum(['sale', 'purchase', 'adjustment', 'return']),
  quantity: z.number().int(),
  reference_id: z.number().nullable(),
  reference_type: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  created_by: z.number()
});

export type InventoryTransaction = z.infer<typeof inventoryTransactionSchema>;

// Input schemas for authentication
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string(),
  role: z.enum(['admin', 'employee']).optional()
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

// Input schemas for customers
export const createCustomerInputSchema = z.object({
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export const updateCustomerInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional()
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

// Input schemas for products
export const createProductInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  sku: z.string(),
  price: z.number().positive(),
  cost_price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative(),
  min_stock_level: z.number().int().nonnegative(),
  category: z.string().nullable(),
  is_active: z.boolean().optional()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  sku: z.string().optional(),
  price: z.number().positive().optional(),
  cost_price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  min_stock_level: z.number().int().nonnegative().optional(),
  category: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Input schemas for orders
export const createOrderInputSchema = z.object({
  customer_id: z.number(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive()
  })),
  discount_amount: z.number().nonnegative().optional(),
  tax_amount: z.number().nonnegative().optional(),
  notes: z.string().nullable().optional()
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const updateOrderInputSchema = z.object({
  id: z.number(),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
  discount_amount: z.number().nonnegative().optional(),
  tax_amount: z.number().nonnegative().optional(),
  notes: z.string().nullable().optional()
});

export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>;

// Input schema for inventory adjustments
export const adjustInventoryInputSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int(),
  transaction_type: z.enum(['adjustment', 'purchase', 'return']),
  notes: z.string().nullable().optional()
});

export type AdjustInventoryInput = z.infer<typeof adjustInventoryInputSchema>;

// Sales report query schema
export const salesReportQuerySchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  customer_id: z.number().optional(),
  product_id: z.number().optional()
});

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
