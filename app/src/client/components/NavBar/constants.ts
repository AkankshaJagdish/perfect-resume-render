import { routes } from "wasp/client/router";
import type { NavigationItem } from "./NavBar";

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Resume", to: routes.ResumeOptimizerRoute.to },
  { name: "Pricing", to: routes.PricingPageRoute.to },
] as const;

export const demoNavigationitems: NavigationItem[] = [
  { name: "Resume", to: routes.ResumeOptimizerRoute.to },
  { name: "Pricing", to: routes.PricingPageRoute.to },
] as const;
