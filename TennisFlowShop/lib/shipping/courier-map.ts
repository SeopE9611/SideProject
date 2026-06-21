export {
  COURIER_CATALOG,
  findCourierCatalogItem,
  getCourierDisplayName,
  getSelectableCourierCatalog,
  mapCourierCodeToCarrierId,
  normalizeCourierCode,
} from "./courier-catalog";

import { COURIER_CATALOG } from "./courier-catalog";

export const COURIER_DISPLAY_NAME_MAP: Record<string, string> =
  Object.fromEntries(COURIER_CATALOG.map((item) => [item.code, item.label]));
