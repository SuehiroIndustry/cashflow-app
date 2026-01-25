export type CashSettingsRow = {
  user_id: string;

  survival_green_months: number;
  survival_yellow_months: number;

  avg_shipments_per_month: number;
  lead_time_months: number;
  safety_buffer_weeks: number;

  min_inventory_units_override: number | null;

  include_consultant_fee_in_survival: boolean;

  created_at: string;
  updated_at: string;
};

export type CashSettingsUpdateInput = {
  survival_green_months?: number;
  survival_yellow_months?: number;

  avg_shipments_per_month?: number;
  lead_time_months?: number;
  safety_buffer_weeks?: number;

  min_inventory_units_override?: number | null;

  include_consultant_fee_in_survival?: boolean;
};

export type DerivedInventoryThreshold = {
  min_inventory_units_calculated: number;
  min_inventory_units_effective: number; // overrideがあればそっち
};