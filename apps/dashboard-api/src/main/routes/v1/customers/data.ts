// Mock data: the template has no domain on purpose (CLAUDE.md). Fixed values
// so lists, pages and tests are deterministic.
const NAMES = [
  'Alice Johnson',
  'Bob Smith',
  'Charlie Brown',
  'Diana Prince',
  'Ethan Hunt',
  'Fiona Gallagher',
  'George Lucas',
  'Hannah Montana',
  'Ian Curtis',
  'Julia Roberts',
  'Kevin Hart',
  'Laura Palmer',
  'Michael Scott',
  'Nina Simone',
  'Oscar Wilde',
  'Paula Abdul',
  'Quentin Blake',
  'Rachel Green',
  'Steve Rogers',
  'Tina Turner',
  'Uma Thurman',
  'Victor Hugo',
  'Wendy Darling',
  'Xavier Woods',
] as const;

export const CUSTOMER_STATUSES = ['active', 'pending', 'inactive'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

const STATUS_CYCLE: CustomerStatus[] = [
  'active',
  'active',
  'pending',
  'inactive',
];
const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2026, 9, 1);

export const CUSTOMERS = NAMES.map((name, i) => ({
  id: String(i + 1),
  name,
  email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
  status: STATUS_CYCLE[i % STATUS_CYCLE.length] as CustomerStatus,
  createdAt: new Date(BASE - i * 3 * DAY).toISOString(),
}));
