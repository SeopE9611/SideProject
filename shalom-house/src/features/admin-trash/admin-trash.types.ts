export const adminTrashDomains = ["news", "programs", "gallery", "transparency"] as const;
export type AdminTrashDomain = (typeof adminTrashDomains)[number];
export type AdminTrashItem = {
  id: string;
  domain: AdminTrashDomain;
  domainLabel: string;
  title: string;
  slug: string;
  deletedAt: string;
  updatedAt: string;
};
