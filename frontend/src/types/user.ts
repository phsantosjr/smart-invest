export type UserProfile = {
  id: string;
  household_id: string | null;
  name: string;
  email: string;
  is_household_owner: boolean;
  is_2fa_enabled: boolean;
};