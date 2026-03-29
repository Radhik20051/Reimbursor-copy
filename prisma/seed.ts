import { hash } from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  let company = await prisma.company.findFirst()

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Default Company",
        currency: "USD",
      },
    })
    console.log(`Created company: ${company.name}`)
  }

  const hashedPasswordEmployee = await hash("123456", 12)
  const hashedPasswordAdmin = await hash("admin123", 12)

  const existingEmployee = await prisma.user.findFirst({
    where: { email: "spranav0812@gmail.com", companyId: company.id },
  })

  const employee = existingEmployee
    ? await prisma.user.update({
        where: { id: existingEmployee.id },
        data: {
          password: hashedPasswordEmployee,
          role: "EMPLOYEE",
          name: "Spranav",
        },
      })
    : await prisma.user.create({
        data: {
          email: "spranav0812@gmail.com",
          password: hashedPasswordEmployee,
          role: "EMPLOYEE",
          name: "Spranav",
          companyId: company.id,
        },
      })

  console.log(`Employee: ${employee.email} (${employee.role})`)

  const existingAdmin = await prisma.user.findFirst({
    where: { email: "admin@example.com", companyId: company.id },
  })

  const admin = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashedPasswordAdmin,
          role: "ADMIN",
          name: "Admin User",
        },
      })
    : await prisma.user.create({
        data: {
          email: "admin@example.com",
          password: hashedPasswordAdmin,
          role: "ADMIN",
          name: "Admin User",
          companyId: company.id,
        },
      })

  console.log(`Admin: ${admin.email} (${admin.role})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
