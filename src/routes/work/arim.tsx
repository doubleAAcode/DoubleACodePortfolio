import { createFileRoute } from "@tanstack/react-router";
import { ArimCaseStudy } from "@/components/ArimCaseStudy";
import { Contact } from "@/components/Contact";
import { CustomCursor } from "@/components/CustomCursor";
import { Nav } from "@/components/Nav";
import { ScrollProgress } from "@/components/ScrollProgress";

export const Route = createFileRoute("/work/arim")({
  head: () => ({
    meta: [
      { title: "ARIM Case Study | Double A" },
      {
        name: "description",
        content:
          "ARIM luxury silk scarf boutique case study covering a bilingual English and Arabic storefront, product videos, WhatsApp order requests, and an owner admin panel.",
      },
      { property: "og:title", content: "ARIM Case Study | Double A" },
      {
        property: "og:description",
        content:
          "An Italian silk scarf boutique with an English and Arabic storefront, order requests, and an admin panel the owner runs without a developer.",
      },
    ],
  }),
  component: ArimPage,
});

function ArimPage() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <CustomCursor />
      <ScrollProgress />
      <Nav />
      <ArimCaseStudy />
      <Contact />
    </main>
  );
}
