import { PrismaClient, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main() {
  const email = "demo@budgetapp.com";

  // Remove existing demo user if present
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const passwordHash = await bcrypt.hash("demo1234", BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "Demo User",
      currency: "CRC",
    },
  });

  // Categories
  const categories = await Promise.all([
    prisma.category.create({ data: { userId: user.id, name: "Salary", color: "#22c55e", icon: "briefcase", type: TransactionType.INCOME } }),
    prisma.category.create({ data: { userId: user.id, name: "Freelance", color: "#10b981", icon: "laptop", type: TransactionType.INCOME } }),
    prisma.category.create({ data: { userId: user.id, name: "Food & Dining", color: "#f97316", icon: "utensils", type: TransactionType.EXPENSE } }),
    prisma.category.create({ data: { userId: user.id, name: "Transportation", color: "#3b82f6", icon: "car", type: TransactionType.EXPENSE } }),
    prisma.category.create({ data: { userId: user.id, name: "Housing", color: "#8b5cf6", icon: "home", type: TransactionType.EXPENSE } }),
    prisma.category.create({ data: { userId: user.id, name: "Entertainment", color: "#ec4899", icon: "film", type: TransactionType.EXPENSE } }),
    prisma.category.create({ data: { userId: user.id, name: "Healthcare", color: "#ef4444", icon: "heart", type: TransactionType.EXPENSE } }),
    prisma.category.create({ data: { userId: user.id, name: "Utilities", color: "#eab308", icon: "zap", type: TransactionType.EXPENSE } }),
    prisma.category.create({ data: { userId: user.id, name: "Savings", color: "#06b6d4", icon: "piggy-bank", type: TransactionType.INCOME } }),
    prisma.category.create({ data: { userId: user.id, name: "Other", color: "#6b7280", icon: "tag", type: null } }),
  ]);

  const [salary, freelance, food, transport, housing, entertainment, healthcare, utilities, savings] = categories;

  // Helper to create a date
  function d(year: number, month: number, day: number): Date {
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const lastMonth = thisMonth === 1 ? 12 : thisMonth - 1;
  const lastMonthYear = thisMonth === 1 ? thisYear - 1 : thisYear;

  // Transactions for THIS month
  const thisMonthTxs = [
    { categoryId: salary.id, amount: 850000, type: TransactionType.INCOME, description: "Monthly salary", date: d(thisYear, thisMonth, 1) },
    { categoryId: freelance.id, amount: 150000, type: TransactionType.INCOME, description: "Web project payment", date: d(thisYear, thisMonth, 5) },
    { categoryId: food.id, amount: 25000, type: TransactionType.EXPENSE, description: "Weekly groceries", date: d(thisYear, thisMonth, 2) },
    { categoryId: food.id, amount: 8500, type: TransactionType.EXPENSE, description: "Lunch with team", date: d(thisYear, thisMonth, 4) },
    { categoryId: food.id, amount: 15000, type: TransactionType.EXPENSE, description: "Restaurant dinner", date: d(thisYear, thisMonth, 8) },
    { categoryId: food.id, amount: 22000, type: TransactionType.EXPENSE, description: "Weekly groceries", date: d(thisYear, thisMonth, 9) },
    { categoryId: transport.id, amount: 35000, type: TransactionType.EXPENSE, description: "Monthly bus pass", date: d(thisYear, thisMonth, 1) },
    { categoryId: transport.id, amount: 12000, type: TransactionType.EXPENSE, description: "Uber rides", date: d(thisYear, thisMonth, 7) },
    { categoryId: housing.id, amount: 280000, type: TransactionType.EXPENSE, description: "Rent payment", date: d(thisYear, thisMonth, 1) },
    { categoryId: housing.id, amount: 15000, type: TransactionType.EXPENSE, description: "Internet service", date: d(thisYear, thisMonth, 3) },
    { categoryId: entertainment.id, amount: 8000, type: TransactionType.EXPENSE, description: "Netflix subscription", date: d(thisYear, thisMonth, 1) },
    { categoryId: entertainment.id, amount: 12000, type: TransactionType.EXPENSE, description: "Movie night", date: d(thisYear, thisMonth, 6) },
    { categoryId: healthcare.id, amount: 45000, type: TransactionType.EXPENSE, description: "Doctor visit", date: d(thisYear, thisMonth, 4) },
    { categoryId: utilities.id, amount: 18000, type: TransactionType.EXPENSE, description: "Electricity bill", date: d(thisYear, thisMonth, 5) },
    { categoryId: utilities.id, amount: 12000, type: TransactionType.EXPENSE, description: "Water bill", date: d(thisYear, thisMonth, 5) },
    { categoryId: savings.id, amount: 100000, type: TransactionType.INCOME, description: "Monthly savings transfer", notes: "Emergency fund", date: d(thisYear, thisMonth, 2) },
  ];

  // Transactions for LAST month
  const lastMonthTxs = [
    { categoryId: salary.id, amount: 850000, type: TransactionType.INCOME, description: "Monthly salary", date: d(lastMonthYear, lastMonth, 1) },
    { categoryId: freelance.id, amount: 200000, type: TransactionType.INCOME, description: "Logo design project", date: d(lastMonthYear, lastMonth, 12) },
    { categoryId: food.id, amount: 28000, type: TransactionType.EXPENSE, description: "Weekly groceries", date: d(lastMonthYear, lastMonth, 3) },
    { categoryId: food.id, amount: 24000, type: TransactionType.EXPENSE, description: "Weekly groceries", date: d(lastMonthYear, lastMonth, 10) },
    { categoryId: food.id, amount: 22000, type: TransactionType.EXPENSE, description: "Weekly groceries", date: d(lastMonthYear, lastMonth, 17) },
    { categoryId: food.id, amount: 18000, type: TransactionType.EXPENSE, description: "Family dinner out", date: d(lastMonthYear, lastMonth, 15) },
    { categoryId: transport.id, amount: 35000, type: TransactionType.EXPENSE, description: "Monthly bus pass", date: d(lastMonthYear, lastMonth, 1) },
    { categoryId: transport.id, amount: 8000, type: TransactionType.EXPENSE, description: "Taxi ride", date: d(lastMonthYear, lastMonth, 20) },
    { categoryId: housing.id, amount: 280000, type: TransactionType.EXPENSE, description: "Rent payment", date: d(lastMonthYear, lastMonth, 1) },
    { categoryId: housing.id, amount: 15000, type: TransactionType.EXPENSE, description: "Internet service", date: d(lastMonthYear, lastMonth, 3) },
    { categoryId: entertainment.id, amount: 8000, type: TransactionType.EXPENSE, description: "Netflix subscription", date: d(lastMonthYear, lastMonth, 1) },
    { categoryId: entertainment.id, amount: 25000, type: TransactionType.EXPENSE, description: "Concert tickets", date: d(lastMonthYear, lastMonth, 18) },
    { categoryId: healthcare.id, amount: 15000, type: TransactionType.EXPENSE, description: "Pharmacy", date: d(lastMonthYear, lastMonth, 8) },
    { categoryId: utilities.id, amount: 20000, type: TransactionType.EXPENSE, description: "Electricity bill", date: d(lastMonthYear, lastMonth, 5) },
    { categoryId: utilities.id, amount: 11000, type: TransactionType.EXPENSE, description: "Water bill", date: d(lastMonthYear, lastMonth, 5) },
    { categoryId: savings.id, amount: 100000, type: TransactionType.INCOME, description: "Monthly savings transfer", date: d(lastMonthYear, lastMonth, 2) },
  ];

  const allTxs = [...thisMonthTxs, ...lastMonthTxs].map((tx) => ({
    userId: user.id,
    categoryId: tx.categoryId,
    amount: tx.amount.toFixed(2),
    type: tx.type,
    description: tx.description,
    notes: "notes" in tx ? (tx as { notes?: string }).notes ?? null : null,
    date: tx.date,
  }));

  await prisma.transaction.createMany({ data: allTxs });

  // Budgets for this month
  const thisMonthBudget = await prisma.budget.create({
    data: {
      userId: user.id,
      year: thisYear,
      month: thisMonth,
      totalLimit: "600000.00",
      budgetCategories: {
        create: [
          { categoryId: food.id, limitAmount: "100000.00" },
          { categoryId: transport.id, limitAmount: "50000.00" },
          { categoryId: housing.id, limitAmount: "300000.00" },
          { categoryId: entertainment.id, limitAmount: "30000.00" },
          { categoryId: healthcare.id, limitAmount: "50000.00" },
          { categoryId: utilities.id, limitAmount: "40000.00" },
        ],
      },
    },
  });

  // Budget for last month
  const lastMonthBudget = await prisma.budget.create({
    data: {
      userId: user.id,
      year: lastMonthYear,
      month: lastMonth,
      totalLimit: "600000.00",
      budgetCategories: {
        create: [
          { categoryId: food.id, limitAmount: "100000.00" },
          { categoryId: transport.id, limitAmount: "50000.00" },
          { categoryId: housing.id, limitAmount: "300000.00" },
          { categoryId: entertainment.id, limitAmount: "30000.00" },
          { categoryId: healthcare.id, limitAmount: "50000.00" },
          { categoryId: utilities.id, limitAmount: "40000.00" },
        ],
      },
    },
  });

  console.log("Seed completed successfully!");
  console.log(`  Demo user: ${email} / demo1234`);
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Transactions: ${allTxs.length}`);
  console.log(`  Budgets: 2 (this month + last month)`);
  console.log(`  Budget ID (this month): ${thisMonthBudget.id}`);
  console.log(`  Budget ID (last month): ${lastMonthBudget.id}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
