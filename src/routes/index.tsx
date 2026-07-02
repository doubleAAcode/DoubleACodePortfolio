import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Loader } from "@/components/Loader";
import { CustomCursor } from "@/components/CustomCursor";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Journey } from "@/components/Journey";
import { Capabilities } from "@/components/Capabilities";
import { Projects } from "@/components/Projects";
import { Metrics } from "@/components/Metrics";
import { Founders } from "@/components/Founders";
import { Contact } from "@/components/Contact";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Double A - Digital Engineering Studio" },
      {
        name: "description",
        content: "Double A - Digital Engineering Studio",
      },
      { property: "og:title", content: "Double A - Digital Engineering Studio" },
      {
        property: "og:description",
        content: "Double A - Digital Engineering Studio",
      },
      { name: "twitter:title", content: "Double A - Digital Engineering Studio" },
      {
        name: "twitter:description",
        content: "Double A - Digital Engineering Studio",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [showLoader, setShowLoader] = useState(true);
  const handleLoaderDone = useCallback(() => setShowLoader(false), []);

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <CustomCursor />
      <ScrollProgress />
      <Nav />
      <Hero />
      <Journey />
      <Capabilities />
      <Projects />
      <Metrics />
      <Founders />
      <Contact />
      {showLoader && <Loader onDone={handleLoaderDone} />}
    </main>
  );
}
