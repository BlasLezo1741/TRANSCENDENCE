import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';

@Injectable()
export class CountriesService {
  constructor(
    @Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    const countries = await this.db
      .select({
        name: schema.country.counName,
        code: schema.country.coun2Pk,
      })
      .from(schema.country)
      .orderBy(schema.country.counName);

    // Trim spaces from char fields
    return countries.map(c => ({
      name: c.name?.trim() || '',
      code: c.code?.trim() || '',
    }));
  }
}