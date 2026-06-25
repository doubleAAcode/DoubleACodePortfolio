export type Person = "Hussein" | "Saeed" | "Third Party";
export type Finder = Person | "Nobody";
export type ExpensePayer = Person | "Studio";
export type ProjectStatus = "Lead" | "In Progress" | "Completed" | "Cancelled";
export type PayoutType = "Profit Share" | "Expense Reimbursement" | "Finder Fee" | "Mixed";

export type StudioSettings = {
  finderFeeRate: number;
  husseinDefaultWorkPercent: number;
  saeedDefaultWorkPercent: number;
};

export type StudioProject = {
  id: string;
  projectId: string;
  name: string;
  client: string;
  totalPrice: number;
  status: ProjectStatus;
  finder: Finder;
  husseinWorkPercent: number;
  saeedWorkPercent: number;
  notes: string;
};

export type ClientPayment = {
  id: string;
  date: string;
  projectId: string;
  amount: number;
  collectedBy: Person | "";
  paymentMethod: string;
  notes: string;
};

export type ProjectExpense = {
  id: string;
  date: string;
  projectId: string;
  expenseType: string;
  paidBy: ExpensePayer;
  amount: number;
  notes: string;
};

export type PartnerPayout = {
  id: string;
  date: string;
  paidTo: Person;
  amount: number;
  payoutType: PayoutType;
  notes: string;
};

export type StudioSpreadsheetData = {
  version: 2;
  settings: StudioSettings;
  projects: StudioProject[];
  clientPayments: ClientPayment[];
  expenses: ProjectExpense[];
  payouts: PartnerPayout[];
};

export type SpreadsheetDocument = {
  data?: StudioSpreadsheetData;
  rows?: unknown[];
  updatedAt: string;
};
