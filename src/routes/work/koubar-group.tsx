import { createFileRoute } from "@tanstack/react-router";
import { Contact } from "@/components/Contact";
import { CustomCursor } from "@/components/CustomCursor";
import { KoubarGroupCaseStudy } from "@/components/KoubarGroupCaseStudy";
import { Nav } from "@/components/Nav";
import { ScrollProgress } from "@/components/ScrollProgress";

export const Route = createFileRoute("/work/koubar-group")({
  head: () => ({
    meta: [
      { title: "Koubar Group Case Study | Double A" },
      {
        name: "description",
        content:
          "Koubar Group interior portfolio website case study covering luxury brand presentation, project galleries, WhatsApp quote paths, and admin-managed portfolio content.",
      },
      { property: "og:title", content: "Koubar Group Case Study | Double A" },
      {
        property: "og:description",
        content:
          "Premium interiors website for kitchens, doors, custom furniture, gallery browsing, and portfolio administration.",
      },
    ],
  }),
  component: KoubarGroupPage,
});

function KoubarGroupPage() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <CustomCursor />
      <ScrollProgress />
      <Nav />
      <KoubarGroupCaseStudy />
      <Contact />
    </main>
  );
}
