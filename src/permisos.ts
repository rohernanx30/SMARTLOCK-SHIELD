import { auth } from "./firebase";

const OWNER_UID = [
  "f0WCBHhRPEaYwnOKYBHdDZoR3pi2",
  "fMooL3wQpEVprACPzGSyxKU1jEg2"
];

export function esPropietario(): boolean {
  return OWNER_UID.includes(auth.currentUser?.uid ?? "");
}
