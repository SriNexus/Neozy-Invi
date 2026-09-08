import { useEffect, useState } from "react";
import type { InvitationData } from "./invitation";
import { invitationStore } from "./store";

/**
 * React hook that subscribes to the invitation store. Returns the
 * current invitation data and re-renders the component whenever the
 * admin edits the invitation.
 */
export function useInvitationStore(): InvitationData {
  const [data, setData] = useState<InvitationData>(() => invitationStore.get());

  useEffect(() => {
    return invitationStore.subscribe(setData);
  }, []);

  return data;
}
