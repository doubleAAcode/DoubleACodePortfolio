import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/flow-templates/$templateId/versions/$versionId")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: location.href.replace("/admin", "/connect/admin") });
  },
});
