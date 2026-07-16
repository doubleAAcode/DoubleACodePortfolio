import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/connect/admin/broadcasts")({
  head: () => ({ meta: [{ title: "Broadcasts — WA Admin" }] }),
  component: () => <Outlet />,
});
