import { landingContent } from "../../../siteConfig";

export function Announcement() {
  return (
    <div className="from-accent to-secondary text-primary-foreground bg-linear-to-r relative flex w-full items-center justify-center gap-3 p-3 text-center text-sm font-semibold">
      <span>{landingContent.hero.eyebrow}</span>
    </div>
  );
}
