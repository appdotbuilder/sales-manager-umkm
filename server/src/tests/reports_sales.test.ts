
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, productsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type SalesReportQuery } from '../schema';
import { generateSalesReport } from '../handlers/reports_sales';

// Test data setup
const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashedpassword',
    full_name: 'Test User',
    role: 'admin' as const
};

const testCustomer = {
    name: 'Test Customer',
    email: 'customer@example.com',
    phone: '123-456-7890',
    address: '123 Test St',
    city: 'Test City'
};

const testProduct1 = {
    name: 'Product A',
    description: 'First test product',
    sku: 'PROD-A-001',
    price: '29.99',
    cost_price: '15.00',
    stock_quantity: 100,
    min_stock_level: 10,
    category: 'electronics'
};

const testProduct2 = {
    name: 'Product B',
    description: 'Second test product',
    sku: 'PROD-B-002',
    price: '49.99',
    cost_price: '25.00',
    stock_quantity: 50,
    min_stock_level: 5,
    category: 'electronics'
};

describe('generateSalesReport', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should generate basic sales report with no orders', async () => {
        const query: SalesReportQuery = {
            start_date: '2024-01-01',
            end_date: '2024-01-31'
        };

        const result = await generateSalesReport(query);

        expect(result.totalSales).toEqual(0);
        expect(result.totalOrders).toEqual(0);
        expect(result.totalQuantitySold).toEqual(0);
        expect(result.averageOrderValue).toEqual(0);
        expect(result.topProducts).toHaveLength(0);
        expect(result.salesByDay).toHaveLength(0);
    });

    it('should generate comprehensive sales report with orders', async () => {
        // Create test data
        const [user] = await db.insert(usersTable).values(testUser).returning().execute();
        const [customer] = await db.insert(customersTable).values(testCustomer).returning().execute();
        const [product1, product2] = await db.insert(productsTable)
            .values([testProduct1, testProduct2])
            .returning()
            .execute();

        // Create orders
        const order1 = {
            customer_id: customer.id,
            user_id: user.id,
            order_number: 'ORD-001',
            status: 'delivered' as const,
            total_amount: '79.98',
            discount_amount: '0',
            tax_amount: '5.00',
            order_date: new Date('2024-01-15')
        };

        const order2 = {
            customer_id: customer.id,
            user_id: user.id,
            order_number: 'ORD-002',
            status: 'delivered' as const,
            total_amount: '149.97',
            discount_amount: '10.00',
            tax_amount: '12.00',
            order_date: new Date('2024-01-20')
        };

        const [createdOrder1, createdOrder2] = await db.insert(ordersTable)
            .values([order1, order2])
            .returning()
            .execute();

        // Create order items
        const orderItems = [
            {
                order_id: createdOrder1.id,
                product_id: product1.id,
                quantity: 2,
                unit_price: '29.99',
                total_price: '59.98'
            },
            {
                order_id: createdOrder1.id,
                product_id: product2.id,
                quantity: 1,
                unit_price: '49.99',
                total_price: '49.99'
            },
            {
                order_id: createdOrder2.id,
                product_id: product2.id,
                quantity: 3,
                unit_price: '49.99',
                total_price: '149.97'
            }
        ];

        await db.insert(orderItemsTable).values(orderItems).execute();

        const query: SalesReportQuery = {
            start_date: '2024-01-01',
            end_date: '2024-01-31'
        };

        const result = await generateSalesReport(query);

        // Verify totals
        expect(result.totalSales).toEqual(229.95);
        expect(result.totalOrders).toEqual(2);
        expect(result.totalQuantitySold).toEqual(6);
        expect(result.averageOrderValue).toBeCloseTo(114.975, 2);

        // Verify top products
        expect(result.topProducts).toHaveLength(2);
        expect(result.topProducts[0].product_name).toEqual('Product B');
        expect(result.topProducts[0].quantity_sold).toEqual(4);
        expect(result.topProducts[0].total_revenue).toEqual(199.96);
        expect(result.topProducts[1].product_name).toEqual('Product A');
        expect(result.topProducts[1].quantity_sold).toEqual(2);
        expect(result.topProducts[1].total_revenue).toEqual(59.98);

        // Verify sales by day
        expect(result.salesByDay).toHaveLength(2);
        expect(result.salesByDay[0].date).toEqual('2024-01-15');
        expect(result.salesByDay[0].total_sales).toEqual(79.98);
        expect(result.salesByDay[0].order_count).toEqual(1);
        expect(result.salesByDay[1].date).toEqual('2024-01-20');
        expect(result.salesByDay[1].total_sales).toEqual(149.97);
        expect(result.salesByDay[1].order_count).toEqual(1);
    });

    it('should filter by customer_id correctly', async () => {
        // Create test data
        const [user] = await db.insert(usersTable).values(testUser).returning().execute();
        const [customer1] = await db.insert(customersTable).values(testCustomer).returning().execute();
        const [customer2] = await db.insert(customersTable).values({
            ...testCustomer,
            name: 'Another Customer',
            email: 'another@example.com'
        }).returning().execute();
        const [product] = await db.insert(productsTable).values(testProduct1).returning().execute();

        // Create orders for different customers
        const orders = [
            {
                customer_id: customer1.id,
                user_id: user.id,
                order_number: 'ORD-001',
                status: 'delivered' as const,
                total_amount: '29.99',
                discount_amount: '0',
                tax_amount: '0',
                order_date: new Date('2024-01-15')
            },
            {
                customer_id: customer2.id,
                user_id: user.id,
                order_number: 'ORD-002',
                status: 'delivered' as const,
                total_amount: '59.98',
                discount_amount: '0',
                tax_amount: '0',
                order_date: new Date('2024-01-16')
            }
        ];

        const [order1, order2] = await db.insert(ordersTable).values(orders).returning().execute();

        await db.insert(orderItemsTable).values([
            {
                order_id: order1.id,
                product_id: product.id,
                quantity: 1,
                unit_price: '29.99',
                total_price: '29.99'
            },
            {
                order_id: order2.id,
                product_id: product.id,
                quantity: 2,
                unit_price: '29.99',
                total_price: '59.98'
            }
        ]).execute();

        const query: SalesReportQuery = {
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            customer_id: customer1.id
        };

        const result = await generateSalesReport(query);

        // Should only include customer1's order
        expect(result.totalSales).toEqual(29.99);
        expect(result.totalOrders).toEqual(1);
        expect(result.totalQuantitySold).toEqual(1);
        expect(result.salesByDay).toHaveLength(1);
        expect(result.salesByDay[0].date).toEqual('2024-01-15');
    });

    it('should filter by product_id correctly', async () => {
        // Create test data
        const [user] = await db.insert(usersTable).values(testUser).returning().execute();
        const [customer] = await db.insert(customersTable).values(testCustomer).returning().execute();
        const [product1, product2] = await db.insert(productsTable)
            .values([testProduct1, testProduct2])
            .returning()
            .execute();

        const [order] = await db.insert(ordersTable).values({
            customer_id: customer.id,
            user_id: user.id,
            order_number: 'ORD-001',
            status: 'delivered' as const,
            total_amount: '79.98',
            discount_amount: '0',
            tax_amount: '0',
            order_date: new Date('2024-01-15')
        }).returning().execute();

        await db.insert(orderItemsTable).values([
            {
                order_id: order.id,
                product_id: product1.id,
                quantity: 1,
                unit_price: '29.99',
                total_price: '29.99'
            },
            {
                order_id: order.id,
                product_id: product2.id,
                quantity: 1,
                unit_price: '49.99',
                total_price: '49.99'
            }
        ]).execute();

        const query: SalesReportQuery = {
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            product_id: product1.id
        };

        const result = await generateSalesReport(query);

        // Should only include product1 in quantity calculation and top products
        expect(result.totalQuantitySold).toEqual(1);
        expect(result.topProducts).toHaveLength(1);
        expect(result.topProducts[0].product_name).toEqual('Product A');
        expect(result.topProducts[0].quantity_sold).toEqual(1);
    });

    it('should handle date range filtering correctly', async () => {
        // Create test data
        const [user] = await db.insert(usersTable).values(testUser).returning().execute();
        const [customer] = await db.insert(customersTable).values(testCustomer).returning().execute();
        const [product] = await db.insert(productsTable).values(testProduct1).returning().execute();

        // Create orders on different dates
        const orders = [
            {
                customer_id: customer.id,
                user_id: user.id,
                order_number: 'ORD-001',
                status: 'delivered' as const,
                total_amount: '29.99',
                discount_amount: '0',
                tax_amount: '0',
                order_date: new Date('2023-12-31') // Outside range
            },
            {
                customer_id: customer.id,
                user_id: user.id,
                order_number: 'ORD-002',
                status: 'delivered' as const,
                total_amount: '29.99',
                discount_amount: '0',
                tax_amount: '0',
                order_date: new Date('2024-01-15') // Inside range
            },
            {
                customer_id: customer.id,
                user_id: user.id,
                order_number: 'ORD-003',
                status: 'delivered' as const,
                total_amount: '29.99',
                discount_amount: '0',
                tax_amount: '0',
                order_date: new Date('2024-02-01') // Outside range
            }
        ];

        const createdOrders = await db.insert(ordersTable).values(orders).returning().execute();

        // Create order items for all orders
        const orderItems = createdOrders.map(order => ({
            order_id: order.id,
            product_id: product.id,
            quantity: 1,
            unit_price: '29.99',
            total_price: '29.99'
        }));

        await db.insert(orderItemsTable).values(orderItems).execute();

        const query: SalesReportQuery = {
            start_date: '2024-01-01',
            end_date: '2024-01-31'
        };

        const result = await generateSalesReport(query);

        // Should only include the January order
        expect(result.totalSales).toEqual(29.99);
        expect(result.totalOrders).toEqual(1);
        expect(result.salesByDay).toHaveLength(1);
        expect(result.salesByDay[0].date).toEqual('2024-01-15');
    });
});
