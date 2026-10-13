// Mock data: the template has no domain on purpose (CLAUDE.md). Fixed values
// so lists, pages and tests are deterministic.
const PEOPLE = [
  ['Erin Walsh', 'Engineering Manager', 'Engineering'],
  ['Frank Ocean', 'Backend Engineer', 'Engineering'],
  ['Grace Hopper', 'Staff Engineer', 'Engineering'],
  ['Henry Ford', 'Sales Lead', 'Sales'],
  ['Iris Murdoch', 'Product Designer', 'Design'],
  ['Jack Ryan', 'Account Executive', 'Sales'],
  ['Kate Bishop', 'Frontend Engineer', 'Engineering'],
  ['Leo Messi', 'Support Specialist', 'Support'],
  ['Mia Wallace', 'UX Researcher', 'Design'],
  ['Noah Bennett', 'Data Analyst', 'Operations'],
  ['Olivia Pope', 'Head of Operations', 'Operations'],
  ['Peter Parker', 'QA Engineer', 'Engineering'],
  ['Quinn Fabray', 'Support Lead', 'Support'],
  ['Ruth Bader', 'Legal Counsel', 'Operations'],
  ['Sam Wilson', 'Sales Engineer', 'Sales'],
  ['Tara Knowles', 'Designer', 'Design'],
] as const;

export const EMPLOYEE_STATUSES = ['active', 'on_leave', 'inactive'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

const STATUS_CYCLE: EmployeeStatus[] = [
  'active',
  'active',
  'active',
  'on_leave',
  'inactive',
];

export const EMPLOYEES = PEOPLE.map(([name, role, department], i) => ({
  id: String(i + 1),
  name,
  email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
  role,
  department,
  status: STATUS_CYCLE[i % STATUS_CYCLE.length] as EmployeeStatus,
}));
