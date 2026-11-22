export type SocialPlatform =
  | "instagram"
  | "x"
  | "facebook"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "pinterest"
  | "threads"
  | "whatsapp"
  | "github"
  | "dribbble"
  | "behance"
  | "email"
  | "website";

export const socialName = (platform: string) =>
  ({ x: "X", linkedin: "LinkedIn", youtube: "YouTube", tiktok: "TikTok", github: "GitHub", whatsapp: "WhatsApp", email: "Email" })[platform] ??
  platform.charAt(0).toUpperCase() + platform.slice(1);
