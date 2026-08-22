import { APP_BUILD_ID as GENERATED_APP_BUILD_ID } from "@/lib/app-build-id.generated";

/** Unique per production build; used to detect stale client bundles after deploy. */
export const APP_BUILD_ID = GENERATED_APP_BUILD_ID;
