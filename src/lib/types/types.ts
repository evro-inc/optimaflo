import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager';
import Stripe from 'stripe';

export interface PageMeta {
  title: string;
  description: string;
  cardImage: string;
}

export interface Customer {
  id: string /* primary key */;
  stripeCustomerId: string;
  userId: string;
}

export interface Product {
  id: string /* primary key */;
  active?: boolean;
  name?: string;
  description?: string;
  image?: string;
  metadata?: Stripe.Metadata;
}

export interface ProductWithPrice extends Product {
  Price: Price[];
}

export interface UserDetails {
  id: string /* primary key */;
  first_name: string;
  last_name: string;
  full_name?: string;
  avatar_url?: string;
  billing_address?: Stripe.Address;
  payment_method?: Stripe.PaymentMethod[Stripe.PaymentMethod.Type];
}

export interface Price {
  id: string /* primary key */;
  productId?: string /* foreign key to products.id */;
  active?: boolean;
  description?: string;
  unitAmount?: number;
  currency?: string;
  type?: Stripe.Price.Type;
  interval?: Stripe.Price.Recurring.Interval;
  recurringInterval: string;
  intervalCount?: number;
  trialPeriodDays?: number | null;
  metadata?: Stripe.Metadata;
  products?: Product;
}

export interface PriceWithProduct extends Price {}

export interface Subscription {
  id: string /* primary key */;
  subId: string;
  user_id: string;
  status?: Stripe.Subscription.Status;
  metadata?: Stripe.Metadata;
  price_id?: string /* foreign key to prices.id */;
  productId: string;
  quantity?: number;
  cancel_at_period_end?: boolean;
  created: string;
  current_period_start: string;
  current_period_end: string;
  ended_at?: string;
  cancel_at?: string;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
  price?: Price; // Updated this line
  User?: User;
}

export interface User {
  id: string /* primary key */;
  stripeCustomerId: null | string;
  subscriptionId: null | string;
  subscriptionStatus: null | string;
  name: null | string;
  email: null | string;
  emailVerified: null | string;
  image: null | string;
  role: string;
  Customer: Customer[];
  Subscription: Subscription[];
}
export type FormElement = {
  accountId: string;
  usageContext: string;
  containerName: string;
  domainName: string;
  notes: string;
  containerId: string;
};

export type Form = {
  forms: FormElement[];
};
export type ContainerType = {
  accountId: string;
  containerId: string;
  name: string;
  publicId: string;
  accountName: string;
  usageContext: string[];
};

export type UpdateAccountResult = {
  success: boolean;
  updatedAccounts?: { accountId: string; name: string }[];
  limitReached?: boolean;
  message?: string;
  error?: string;
  notFoundError?: boolean;
  notFoundIds?: string[];
  accountIds?: string[];
  names?: string[];
};

export type GAUpdateAccountResult = {
  success: boolean;
  updatedAccounts?: { name: string; displayName: string }[];
  limitReached?: boolean;
  message?: string;
  error?: string;
  notFoundError?: boolean;
  notFoundIds?: string[];
  accountIds?: string[];
  names?: string[];
};

export type FormUpdateContainerProps = {
  showOptions: boolean;
  onClose: () => void;
  accounts: any; // Replace 'any' with the actual type if known
  selectedRows: Map<string, ContainerType>;
  table: any;
};

export type FormUpdateWorkspaceProps = {
  showOptions: boolean;
  onClose: () => void;
  accounts: any; // Replace 'any' with the actual type if known
  selectedRows: Map<string, ContainerType>;
  workspaces?: any;
  table: any;
};

export type ResultType = {
  data: tagmanager_v2.Schema$Container[] | undefined;
  meta: {
    total: number;
    pageNumber: number;
    totalPages: number;
    pageSize: number;
  };
  errors: null;
};

export type PostParams = {
  userId: string;
  accountId: string;
  name: string;
  usageContext: string[];
  domainName: string;
  notes: string;
};

export type CreateResult = {
  success: boolean;
  limitReached?: boolean;
  message?: string;
  createdContainers?: any[];
  errors?: string;
};

export type FormCreateContainerProps = {
  showOptions: boolean;
  onClose: () => void;
  accounts: any;
};

export type FormCreateWorkspaceProps = {
  showOptions: boolean;
  onClose: () => void;
  accounts: any;
  table: any;
};

export type WorkspaceType = {
  accountId: string;
  containerId: string;
  workspaceId: string;
  name: string;
  containerName: string;
};

export type WorkspaceData = {
  accountId: string;
  containerId: string;
  workspaceId: string;
  workspaceName: string;
};

export interface FeatureResult {
  id: string[];
  name: string[];
  success: boolean;
  notFound?: boolean;
  limitReached?: boolean;
  remaining?: number;
}

export interface FeatureResponse {
  success: boolean;
  features?: string[];
  errors?: string[];
  limitReached?: boolean;
  errorCode?: number;
  message?: string;
  results: FeatureResult[];
  notFoundError?: boolean;
  revalidationSuccess?: boolean;
}
export type Account = {
  accountId: string;
  name: string;
};

export type Container = {
  accountId: string;
  containerId: string;
  name: string;
  publicId: string;
  usageContext: string[];
};

export type Workspace = {
  accountId: string;
  containerId: string;
  workspaceId: string;
  name: string;
};
