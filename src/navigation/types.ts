import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Month } from '../domain/dates';

export type RootStackParamList = {
  Dashboard: undefined;
  /** The name is read from the database, so a rename never leaves a stale title behind. */
  CategoryDetail: { categoryId: number; month: Month };
  CategoryForm: { categoryId?: number } | undefined;
  CategoryReassign: { categoryId: number };
  Settings: undefined;
  Accounts: undefined;
  Budget: { month?: Month } | undefined;
  BudgetForm: { categoryId: number; month: Month };
  TransferForm: { transferId?: number } | undefined;
  Transactions: { month?: Month; accountId?: number; categoryId?: number } | undefined;
  AccountForm: { accountId?: number } | undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

declare global {
  namespace ReactNavigation {
    // Types useNavigation() and <Link> app-wide (React Navigation's documented pattern).
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
