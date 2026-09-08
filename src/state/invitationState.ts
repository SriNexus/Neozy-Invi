export type InvitationStage = "cover" | "video" | "card";

export type AudioState = "off" | "on";

/**
 * NEOZY-INVI opening state machine:
 *
 *   COVER --(user tap)--> OPENING_VIDEO --(video ends / errors)--> FIRST_INVITATION_CARD
 *
 * Audio is intentionally modeled as an independent axis: a single looping
 * background track starts at the same user gesture that starts the video
 * (which is itself always silent), and is never turned off by the video
 * ending or the stage changing — only by an explicit user toggle.
 */
export const STAGE_ORDER: InvitationStage[] = ["cover", "video", "card"];
