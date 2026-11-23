export type InstitutionType = "BROKERAGE" | "BANK" | "BOTH";

export type Institution = {
  id: string;
  name: string;
  code: string | null;
  institution_type: InstitutionType;
};

export type BrokerageAccount = {
  id: string;
  user_id: string;
  institution_id: string;
  account_number: string;
  created_at: string;
  institution: Institution;
};

export type BrokerageAccountWrite = {
  institution_id: string;
  account_number: string;
};
