import aiReadyDark from "../client/static/assets/aiready-dark.webp";
import aiReady from "../client/static/assets/aiready.webp";
import { HighlightedFeature } from "./components/HighlightedFeature";

export function AIReady() {
  return (
    <HighlightedFeature
      name="From job description to tailored PDF"
      description="Upload your existing resume, paste the target job description, and get a focused resume that is ready to submit."
      highlightedComponent={<AIReadyExample />}
      direction="row-reverse"
    />
  );
}

function AIReadyExample() {
  return (
    <div className="w-full">
      <img
        src={aiReady}
        alt="AI Ready"
        loading="lazy"
        className="dark:hidden"
      />
      <img
        src={aiReadyDark}
        alt="AI Ready"
        loading="lazy"
        className="hidden dark:block"
      />
    </div>
  );
}
