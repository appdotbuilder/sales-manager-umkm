
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type Customer } from '../schema';
import { eq } from 'drizzle-orm';

export const getCustomerById = async (id: number): Promise<Customer | null> => {
  try {
    const result = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const customer = result[0];
    return {
      ...customer,
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      created_at: customer.created_at,
      updated_at: customer.updated_at
    };
  } catch (error) {
    console.error('Failed to get customer by ID:', error);
    throw error;
  }
};
