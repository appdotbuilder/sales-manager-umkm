
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  loginInputSchema,
  registerInputSchema,
  createCustomerInputSchema,
  updateCustomerInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  createOrderInputSchema,
  updateOrderInputSchema,
  adjustInventoryInputSchema,
  salesReportQuerySchema
} from './schema';

// Import handlers
import { loginUser } from './handlers/auth_login';
import { registerUser } from './handlers/auth_register';
import { createCustomer } from './handlers/customers_create';
import { getAllCustomers } from './handlers/customers_get_all';
import { getCustomerById } from './handlers/customers_get_by_id';
import { updateCustomer } from './handlers/customers_update';
import { deleteCustomer } from './handlers/customers_delete';
import { createProduct } from './handlers/products_create';
import { getAllProducts } from './handlers/products_get_all';
import { getProductById } from './handlers/products_get_by_id';
import { updateProduct } from './handlers/products_update';
import { deleteProduct } from './handlers/products_delete';
import { createOrder } from './handlers/orders_create';
import { getAllOrders } from './handlers/orders_get_all';
import { getOrderById } from './handlers/orders_get_by_id';
import { updateOrder } from './handlers/orders_update';
import { adjustInventory } from './handlers/inventory_adjust';
import { getInventoryTransactions } from './handlers/inventory_get_transactions';
import { getLowStockProducts } from './handlers/inventory_get_low_stock';
import { generateSalesReport } from './handlers/reports_sales';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  auth: router({
    login: publicProcedure
      .input(loginInputSchema)
      .mutation(({ input }) => loginUser(input)),
    register: publicProcedure
      .input(registerInputSchema)
      .mutation(({ input }) => registerUser(input)),
  }),

  // Customer management routes
  customers: router({
    create: publicProcedure
      .input(createCustomerInputSchema)
      .mutation(({ input }) => createCustomer(input)),
    getAll: publicProcedure
      .query(() => getAllCustomers()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getCustomerById(input.id)),
    update: publicProcedure
      .input(updateCustomerInputSchema)
      .mutation(({ input }) => updateCustomer(input)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteCustomer(input.id)),
  }),

  // Product management routes
  products: router({
    create: publicProcedure
      .input(createProductInputSchema)
      .mutation(({ input }) => createProduct(input)),
    getAll: publicProcedure
      .query(() => getAllProducts()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getProductById(input.id)),
    update: publicProcedure
      .input(updateProductInputSchema)
      .mutation(({ input }) => updateProduct(input)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteProduct(input.id)),
  }),

  // Order management routes
  orders: router({
    create: publicProcedure
      .input(createOrderInputSchema)
      .mutation(({ input }) => createOrder(input, 1)), // TODO: Get userId from context
    getAll: publicProcedure
      .query(() => getAllOrders()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getOrderById(input.id)),
    update: publicProcedure
      .input(updateOrderInputSchema)
      .mutation(({ input }) => updateOrder(input)),
  }),

  // Inventory management routes
  inventory: router({
    adjust: publicProcedure
      .input(adjustInventoryInputSchema)
      .mutation(({ input }) => adjustInventory(input, 1)), // TODO: Get userId from context
    getTransactions: publicProcedure
      .input(z.object({ productId: z.number().optional() }))
      .query(({ input }) => getInventoryTransactions(input.productId)),
    getLowStock: publicProcedure
      .query(() => getLowStockProducts()),
  }),

  // Reports routes
  reports: router({
    sales: publicProcedure
      .input(salesReportQuerySchema)
      .query(({ input }) => generateSalesReport(input)),
  }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
