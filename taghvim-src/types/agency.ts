export type GovernmentAgency = {
  id: string;
  name: string;
  slug: string;
  shortName: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AgencyInput = {
  name: string;
  shortName: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
};
