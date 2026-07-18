import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/connect/admin/contacts")({
  head: () => ({ meta: [{ title: "Contacts - WA Admin" }] }),
  component: () => <Outlet />,
});
