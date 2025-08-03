
import { db } from '../db';
import { ordersTable, orderItemsTable, productsTable } from '../db/schema';
import { type SalesReportQuery } from '../schema';
import { eq, and, gte, lte, desc, sql, sum, count } from 'drizzle-orm';

interface SalesReportData {
    totalSales: number;
    totalOrders: number;
    totalQuantitySold: number;
    averageOrderValue: number;
    topProducts: Array<{
        product_id: number;
        product_name: string;
        quantity_sold: number;
        total_revenue: number;
    }>;
    salesByDay: Array<{
        date: string;
        total_sales: number;
        order_count: number;
    }>;
}

export async function generateSalesReport(query: SalesReportQuery): Promise<SalesReportData> {
    try {
        // Parse date inputs
        const startDate = new Date(query.start_date);
        const endDate = new Date(query.end_date);

        // Build base conditions for date range
        const baseConditions: any[] = [
            gte(ordersTable.order_date, startDate),
            lte(ordersTable.order_date, endDate)
        ];

        // Add optional customer filter
        if (query.customer_id) {
            baseConditions.push(eq(ordersTable.customer_id, query.customer_id));
        }

        // Get total sales and orders
        const totalSalesQuery = db.select({
            totalSales: sum(ordersTable.total_amount),
            totalOrders: count(ordersTable.id)
        })
        .from(ordersTable)
        .where(and(...baseConditions));

        const [totalSalesResult] = await totalSalesQuery.execute();

        const totalSales = parseFloat(totalSalesResult.totalSales || '0');
        const totalOrders = totalSalesResult.totalOrders || 0;
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        // Get total quantity sold - build query step by step
        let quantityQuery = db.select({
            totalQuantity: sum(orderItemsTable.quantity)
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.order_id, ordersTable.id));

        // Build conditions for quantity query
        const quantityConditions = [...baseConditions];
        if (query.product_id) {
            quantityConditions.push(eq(orderItemsTable.product_id, query.product_id));
        }

        const quantityResult = await quantityQuery.where(and(...quantityConditions)).execute();
        const totalQuantitySold = parseInt(quantityResult[0]?.totalQuantity || '0');

        // Get top products - build query step by step
        let topProductsQuery = db.select({
            product_id: orderItemsTable.product_id,
            product_name: productsTable.name,
            quantity_sold: sum(orderItemsTable.quantity),
            total_revenue: sum(orderItemsTable.total_price)
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.order_id, ordersTable.id))
        .innerJoin(productsTable, eq(orderItemsTable.product_id, productsTable.id));

        // Build conditions for top products query
        const topProductsConditions = [...baseConditions];
        if (query.product_id) {
            topProductsConditions.push(eq(orderItemsTable.product_id, query.product_id));
        }

        const topProductsResults = await topProductsQuery
            .where(and(...topProductsConditions))
            .groupBy(orderItemsTable.product_id, productsTable.name)
            .orderBy(desc(sum(orderItemsTable.total_price)))
            .limit(10)
            .execute();

        const topProducts = topProductsResults.map(product => ({
            product_id: product.product_id,
            product_name: product.product_name,
            quantity_sold: parseInt(product.quantity_sold || '0'),
            total_revenue: parseFloat(product.total_revenue || '0')
        }));

        // Get sales by day
        const salesByDayQuery = db.select({
            date: sql<string>`DATE(${ordersTable.order_date})`,
            total_sales: sum(ordersTable.total_amount),
            order_count: count(ordersTable.id)
        })
        .from(ordersTable)
        .where(and(...baseConditions))
        .groupBy(sql`DATE(${ordersTable.order_date})`)
        .orderBy(sql`DATE(${ordersTable.order_date})`);

        const salesByDayResults = await salesByDayQuery.execute();

        const salesByDay = salesByDayResults.map(day => ({
            date: day.date,
            total_sales: parseFloat(day.total_sales || '0'),
            order_count: day.order_count || 0
        }));

        return {
            totalSales,
            totalOrders,
            totalQuantitySold,
            averageOrderValue,
            topProducts,
            salesByDay
        };
    } catch (error) {
        console.error('Sales report generation failed:', error);
        throw error;
    }
}
