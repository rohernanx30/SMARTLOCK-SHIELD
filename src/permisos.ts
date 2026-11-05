import { auth } from "./firebase";

const OWNER_UID = "f0WCBHhRPEaYwnOKYBHdDZoR3pi2";

export function esPropietario(): boolean {
  return auth.currentUser?.uid === OWNER_UID;
}