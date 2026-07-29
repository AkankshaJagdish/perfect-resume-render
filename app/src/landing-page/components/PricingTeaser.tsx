import { CheckCircle } from "lucide-react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../../client/components/ui/button";
import { Card, CardContent } from "../../client/components/ui/card";
import { pricingContent } from "../../siteConfig";

export function PricingTeaser() {
  return (
    <section className="mx-auto my-12 max-w-4xl px-4" id="pricing">
      <Card>
        <CardContent className="grid gap-6 p-6 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="text-primary text-sm font-semibold">
              {pricingContent.starter.name}
            </p>
            <h2 className="text-foreground mt-2 text-3xl font-bold">
              {pricingContent.heading}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              {pricingContent.subheading}
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="flex items-baseline gap-1">
              <span className="text-foreground text-3xl font-bold">
                {pricingContent.starter.price}
              </span>
              <span className="text-muted-foreground text-sm">
                {pricingContent.starter.interval}
              </span>
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {pricingContent.starter.features.slice(0, 3).map((feature) => (
                <li key={feature} className="flex gap-2">
                  <CheckCircle className="text-primary h-4 w-4 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="mt-5 w-full" asChild>
              <WaspRouterLink to={routes.PricingPageRoute.to}>
                View Starter Plan
              </WaspRouterLink>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
