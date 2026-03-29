import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...');

  await prisma.country.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.approvalRule.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  console.log('Cleared existing data');

  try {
    const response = await fetch(
      'https://restcountries.com/v3.1/all?fields=name,currencies'
    );
    const countries = await response.json();

    for (const country of countries) {
      const currencyCode = Object.keys(country.currencies || {})[0];
      if (currencyCode) {
        await prisma.country.create({
          data: {
            name: country.name.common,
            currencyCode,
            currencySymbol: country.currencies[currencyCode]?.symbol,
          },
        });
      }
    }
    console.log(`Seeded ${countries.length} countries`);
  } catch (error) {
    console.error('Failed to seed countries:', error);
  }

  const company = await prisma.company.create({
    data: {
      name: 'Demo Company',
      country: 'India',
      currency: 'INR',
    },
  });
  console.log('Created demo company');

  const passwordHash = await bcrypt.hash('demo1234', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@demo.com',
      passwordHash,
      role: 'ADMIN',
      companyId: company.id,
    },
  });
  console.log('Created admin user');

  const manager = await prisma.user.create({
    data: {
      name: 'Manager User',
      email: 'manager@demo.com',
      passwordHash,
      role: 'MANAGER',
      companyId: company.id,
    },
  });
  console.log('Created manager user');

  const employee1 = await prisma.user.create({
    data: {
      name: 'John Employee',
      email: 'john@demo.com',
      passwordHash,
      role: 'EMPLOYEE',
      companyId: company.id,
      managerId: manager.id,
      isManagerApprover: true,
    },
  });

  const employee2 = await prisma.user.create({
    data: {
      name: 'Jane Employee',
      email: 'jane@demo.com',
      passwordHash,
      role: 'EMPLOYEE',
      companyId: company.id,
      managerId: manager.id,
    },
  });
  console.log('Created employee users');

  const approvalRule = await prisma.approvalRule.create({
    data: {
      companyId: company.id,
      name: 'Standard Expense Approval',
      description: 'Default approval workflow for all expenses',
      isManagerApprover: true,
      ruleType: 'SEQUENTIAL',
      steps: {
        create: [
          {
            approverId: manager.id,
            stepOrder: 1,
            isRequired: true,
          },
          {
            approverId: admin.id,
            stepOrder: 2,
            isRequired: true,
          },
        ],
      },
    },
  });
  console.log('Created approval rule');

  console.log('\n✅ Seed completed successfully!');
  console.log('\nDemo accounts:');
  console.log('  Admin:    admin@demo.com / demo1234');
  console.log('  Manager:  manager@demo.com / demo1234');
  console.log('  Employee: john@demo.com / demo1234');
  console.log('  Employee: jane@demo.com / demo1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
