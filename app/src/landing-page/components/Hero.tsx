import { useAuth } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../../client/components/ui/button";

export function Hero() {
  const { data: user } = useAuth();
  const primaryCtaRoute = user
    ? routes.ResumeOptimizerRoute.to
    : routes.LoginRoute.to;

  return (
    <div className="relative w-full pt-14">
      <TopGradient />
      <BottomGradient />
      <div className="md:p-24">
        <div className="max-w-8xl mx-auto px-6 lg:px-8">
          <div className="lg:mb-18 mx-auto max-w-3xl text-center">
            <h1 className="text-foreground text-5xl font-bold sm:text-6xl">
              Every application deserves its own{" "}
              <span className="text-gradient-primary">resume.</span>
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-8">
              PerfectResume helps you create a tailored, ATS-friendly resume in
              under a minute, so every application can speak directly to the
              role.
            </p>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-6">
              Uploaded resumes are processed only to generate your optimized
              version and are not permanently stored.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" variant="outline" asChild>
                <WaspRouterLink to={routes.PricingPageRoute.to}>
                  View Pricing
                </WaspRouterLink>
              </Button>
              <Button size="lg" variant="default" asChild>
                <WaspRouterLink to={primaryCtaRoute}>
                  Generate My Resume <span aria-hidden="true">→</span>
                </WaspRouterLink>
              </Button>
            </div>
          </div>
          <div className="mt-14 flow-root sm:mt-14">
            <div className="m-2 hidden justify-center rounded-xl md:flex lg:-m-4 lg:rounded-2xl lg:p-4">
              <div className="bg-card w-full max-w-4xl rounded-2xl border p-6 text-left shadow-2xl ring-1 ring-gray-900/10">
                <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
                  <div className="space-y-3 rounded-xl bg-muted p-4">
                    <p className="text-sm font-semibold">Resume Upload</p>
                    <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
                      Senior Product Manager Resume.pdf
                    </div>
                    <p className="text-sm font-semibold">Target Role</p>
                    <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
                      Paste a job description and generate a focused resume.
                    </div>
                  </div>
                  <div className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        Latest Generated Resume
                      </p>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        ATS Score 92
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>✓ Tailored summary and experience bullets</p>
                      <p>✓ ATS-friendly formatting</p>
                      <p>✓ Professional PDF ready to download</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopGradient() {
  return (
    <div
      className="absolute right-0 top-0 -z-10 w-full transform-gpu overflow-hidden blur-3xl sm:top-0"
      aria-hidden="true"
    >
      <div
        className="aspect-1020/880 w-280 bg-linear-to-tr flex-none from-amber-400 to-purple-300 opacity-10 sm:right-1/4 sm:translate-x-1/2 dark:hidden"
        style={{
          clipPath:
            "polygon(80% 20%, 90% 55%, 50% 100%, 70% 30%, 20% 50%, 50% 0)",
        }}
      />
    </div>
  );
}

function BottomGradient() {
  return (
    <div
      className="absolute inset-x-0 top-[calc(100%-40rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-65rem)]"
      aria-hidden="true"
    >
      <div
        className="aspect-1020/880 w-360 bg-linear-to-br relative from-amber-400 to-purple-300 opacity-10 sm:-left-3/4 sm:translate-x-1/4 dark:hidden"
        style={{
          clipPath: "ellipse(80% 30% at 80% 50%)",
        }}
      />
    </div>
  );
}
