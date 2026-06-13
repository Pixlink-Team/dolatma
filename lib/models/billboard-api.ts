export interface ExternalCampaign {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  client_name: string | null;
  client_phone: string | null;
  start_date: string;
  end_date: string;
  start_date_shamsi: string;
  end_date_shamsi: string;
  date_range_shamsi: string;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalBillboard {
  id: string;
  axis: string;
  code: string;
  area_sqm: number | null;
  width_m: number | null;
  length_m: number | null;
  provider_id: string | null;
  peak_visit_periods: string[];
  visit_volume_band: string | null;
  quality_tier: string | null;
  price: number | null;
  billboard_type: string | null;
  face_direction: string | null;
  has_backlight: boolean | null;
  has_light: boolean | null;
  latitude: number;
  longitude: number;
  address: string;
  image_url: string | null;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalPaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ExternalCampaignsResponse {
  data: ExternalCampaign[];
}

export interface ExternalBillboardsResponse {
  data: ExternalBillboard[];
  meta?: ExternalPaginatedMeta;
}

export function getExternalBillboardTag(externalId: string): string {
  return `map:${externalId}`;
}
