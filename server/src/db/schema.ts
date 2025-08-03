
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'employee']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);
export const transactionTypeEnum = pgEnum('transaction_type', ['sale', 'purchase', 'adjustment', 'return']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull().default('employee'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sku: text('sku').notNull().unique(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  min_stock_level: integer('min_stock_level').notNull().default(0),
  category: text('category'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Orders table
export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').notNull(),
  user_id: integer('user_id').notNull(),
  order_number: text('order_number').notNull().unique(),
  status: orderStatusEnum('status').notNull().default('pending'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  order_date: timestamp('order_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Order items table
export const orderItemsTable = pgTable('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Inventory transactions table for stock tracking
export const inventoryTransactionsTable = pgTable('inventory_transactions', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull(),
  transaction_type: transactionTypeEnum('transaction_type').notNull(),
  quantity: integer('quantity').notNull(),
  reference_id: integer('reference_id'),
  reference_type: text('reference_type'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: integer('created_by').notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  orders: many(ordersTable),
  inventoryTransactions: many(inventoryTransactionsTable),
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  orders: many(ordersTable),
}));

export const productsRelations = relations(productsTable, ({ many }) => ({
  orderItems: many(orderItemsTable),
  inventoryTransactions: many(inventoryTransactionsTable),
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [ordersTable.customer_id],
    references: [customersTable.id],
  }),
  user: one(usersTable, {
    fields: [ordersTable.user_id],
    references: [usersTable.id],
  }),
  items: many(orderItemsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.order_id],
    references: [ordersTable.id],
  }),
  product: one(productsTable, {
    fields: [orderItemsTable.product_id],
    references: [productsTable.id],
  }),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactionsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [inventoryTransactionsTable.product_id],
    references: [productsTable.id],
  }),
  createdBy: one(usersTable, {
    fields: [inventoryTransactionsTable.created_by],
    references: [usersTable.id],
  }),
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  customers: customersTable,
  products: productsTable,
  orders: ordersTable,
  orderItems: orderItemsTable,
  inventoryTransactions: inventoryTransactionsTable,
};
