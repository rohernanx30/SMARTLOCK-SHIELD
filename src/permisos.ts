import { auth } from "./firebase";

const OWNER_UIDS = [
  "f0WCBHhRPEaYwnOKYBHdDZoR3pi2",
  "fMooL3wQpEVprACPzGSyxKU1jEg2"
];

export function esPropietario(): boolean {
  return OWNER_UIDS.includes(auth.currentUser?.uid ?? "");
}
