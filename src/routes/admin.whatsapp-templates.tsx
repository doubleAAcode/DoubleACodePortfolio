import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/whatsapp-templates")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: location.href.replace("/admin", "/connect/admin") });
  },
});
