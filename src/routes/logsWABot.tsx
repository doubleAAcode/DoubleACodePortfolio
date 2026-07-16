import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/logsWABot")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: location.href.replace("/logsWABot", "/connect/logs") });
  },
});
