export type Person = "Hussein" | "Saeed" | "Third Party";
export type Finder = Person | "Nobody";
export type ExpensePayer = Person | "Studio";
export type ProjectStatus = "Lead" | "In Progress" | "Completed" | "Cancelled";
export type PayoutType = "Profit Share" | "Expense Reimbursement" | "Finder Fee" | "Mixed";
export type FinderFeeMode = "default" | "percent" | "fixed";

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
  finderFeeMode: FinderFeeMode;
  finderFeeValue: number;
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
  projectId: string;
  paidTo: Person;
  amount: number;
  payoutType: PayoutType;
  notes: string;
};

export type ClientLogin = {
  id: string;
  label: string;
  url: string;
  username: string;
  password: string;
  notes: string;
};

export type ClientRecord = {
  id: string;
  name: string;
  website: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  hostingProvider: string;
  hostingDetails: string;
  hostingStarted: string;
  hostingRenewal: string;
  hostingCost: string;
  domainName: string;
  domainRegistrar: string;
  domainStarted: string;
  domainRenewal: string;
  domainCost: string;
  mailProvider: string;
  mailStarted: string;
  mailRenewal: string;
  mailCost: string;
  logins: ClientLogin[];
  notes: string;
};

export type ClientsVaultContent = {
  version: 1;
  clients: ClientRecord[];
};

// Client logins are saved only as ciphertext (see src/lib/client-vault.ts).
export type EncryptedVault = {
  v: 1;
  salt: string;
  iterations: number;
  iv: string;
  data: string;
};

export type StudioSpreadsheetData = {
  version: 2;
  settings: StudioSettings;
  projects: StudioProject[];
  clientPayments: ClientPayment[];
  expenses: ProjectExpense[];
  payouts: PartnerPayout[];
  clientVault?: EncryptedVault;
};

export type SpreadsheetDocument = {
  data?: StudioSpreadsheetData;
  rows?: unknown[];
  updatedAt: string;
};
