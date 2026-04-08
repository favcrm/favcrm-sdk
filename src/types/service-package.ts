export interface ServicePackageOrder {
  id: string;
  packageId: string | null;
  packageName: string;
  sessionsTotal: number;
  sessionsUsed: number;
  expiresAt: string | null;
  createdAt: string;
}
