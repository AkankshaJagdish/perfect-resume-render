import getInterviewsDark from "../client/static/assets/GetInterviews.png"; // Or use a specific dark version if you have one
import getInterviews from "../client/static/assets/GetInterviews.png";
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
        src={getInterviews}
        alt="Get Interviews"
        loading="lazy"
        className="dark:hidden"
      />
      <img
        src={getInterviewsDark}
        alt="Get Interviews"
        loading="lazy"
        className="hidden dark:block"
      />
    </div>
  );
}
