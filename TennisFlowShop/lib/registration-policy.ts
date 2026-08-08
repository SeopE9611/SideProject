import "server-only";

import {
  SETTINGS_COLLECTION,
  defaultUserSettings,
  userSettingsSchema,
} from "@/lib/admin-settings";
import { getDb } from "@/lib/mongodb";
import type { Db } from "mongodb";

const REGISTRATION_SETTINGS_ID = "adminUserSettings";
const registrationPolicySchema = userSettingsSchema.pick({
  allowRegistration: true,
  minimumPasswordLength: true,
});

export type RegistrationPolicy = {
  allowRegistration: boolean;
  minimumPasswordLength: number;
};

export async function getRegistrationPolicy(db?: Db): Promise<RegistrationPolicy> {
  const database = db ?? (await getDb());
  const doc = await database
    .collection<{ _id: string; value?: unknown }>(SETTINGS_COLLECTION)
    .findOne({ _id: REGISTRATION_SETTINGS_ID });
  const parsed = registrationPolicySchema.safeParse({
    allowRegistration: defaultUserSettings.allowRegistration,
    minimumPasswordLength: defaultUserSettings.minimumPasswordLength,
    ...(doc?.value && typeof doc.value === "object" ? doc.value : {}),
  });

  return parsed.success
    ? parsed.data
    : {
        allowRegistration: defaultUserSettings.allowRegistration,
        minimumPasswordLength: defaultUserSettings.minimumPasswordLength,
      };
}
