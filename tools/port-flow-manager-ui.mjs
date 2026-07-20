import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "flow-manager", "src");
const routesRoot = path.join(repoRoot, "src", "routes");
const clientRoutesRoot = path.join(routesRoot, "connect", "client");
const featureRoot = path.join(repoRoot, "src", "features", "connect", "flow-manager-ui");
const componentsRoot = path.join(featureRoot, "components");
const previewDataRoot = path.join(featureRoot, "preview-data");
const connectedClientRoutes = new Set(["automations.tsx"]);
const connectedAdminRouteFiles = new Set([
  "connect.admin.businesses.index.tsx",
  "connect.admin.businesses.$id.tsx",
  "connect.admin.businesses.$id.index.tsx",
  "connect.admin.businesses.$id.catalog-routes.tsx",
  "connect.admin.businesses.$id.route-values.tsx",
  "connect.admin.businesses.$id.products.tsx",
  "connect.admin.businesses.$id.checkout.tsx",
]);

const adminRoots = [
  "analytics",
  "broadcasts",
  "businesses",
  "contacts",
  "developers",
  "flow-templates",
  "inbox",
  "logs",
  "settings",
  "whatsapp-templates",
];

await removeOldConnectUiRoutes();
await copyPresentationComponents();
await copyPreviewData();
await portRoutes();

async function removeOldConnectUiRoutes() {
  const entries = await readdir(routesRoot, { withFileTypes: true });

  for (const entry of entries) {
    const isOldAdminRoute =
      entry.isFile() &&
      entry.name.startsWith("connect.admin.") &&
      entry.name !== "connect.admin.tsx" &&
      !connectedAdminRouteFiles.has(entry.name);
    const isGeneratedClientRoute = entry.isFile() && entry.name.startsWith("connect.client.");
    if (isOldAdminRoute || isGeneratedClientRoute) {
      await rm(path.join(routesRoot, entry.name));
    }
  }

  await mkdir(clientRoutesRoot, { recursive: true });
  const clientEntries = await readdir(clientRoutesRoot, { withFileTypes: true });
  for (const entry of clientEntries) {
    if (entry.isFile() && connectedClientRoutes.has(entry.name)) continue;
    await rm(path.join(clientRoutesRoot, entry.name), {
      recursive: entry.isDirectory(),
      force: true,
    });
  }
}

async function copyPresentationComponents() {
  await rm(componentsRoot, { recursive: true, force: true });
  await mkdir(componentsRoot, { recursive: true });

  const source = path.join(sourceRoot, "components");
  const entries = await readdir(source, { withFileTypes: true });
  const componentNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
    .map((entry) => entry.name.replace(/\.tsx$/, ""));

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".tsx")) continue;
    const input = await readFile(path.join(source, entry.name), "utf8");
    await writeFile(
      path.join(componentsRoot, entry.name),
      enhancePresentationComponent(transformSource(input, componentNames), entry.name),
      "utf8",
    );
  }
}

function enhancePresentationComponent(source, componentName) {
  if (componentName !== "app-sidebar.tsx" && componentName !== "client-sidebar.tsx") {
    return source;
  }

  return `import { FlowManagerFutureBadge } from "@/features/connect/flow-manager-ui/future-badge";\n${source}`.replace(
    "<span>{item.title}</span>",
    "<span>{item.title}</span>\n                  <FlowManagerFutureBadge route={item.url} />",
  );
}

async function copyPreviewData() {
  await rm(previewDataRoot, { recursive: true, force: true });
  await mkdir(previewDataRoot, { recursive: true });

  for (const name of [
    "format.ts",
    "mock-client.ts",
    "mock-data.ts",
    "mock-enterprise.ts",
    "mock-extra.ts",
  ]) {
    await copyFile(path.join(sourceRoot, "lib", name), path.join(previewDataRoot, name));
  }
}

async function portRoutes() {
  const sourceRoutes = path.join(sourceRoot, "routes");
  const entries = await readdir(sourceRoutes, { withFileTypes: true });
  const componentEntries = await readdir(path.join(sourceRoot, "components"), {
    withFileTypes: true,
  });
  const componentNames = componentEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
    .map((entry) => entry.name.replace(/\.tsx$/, ""));

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".tsx")) continue;
    if (entry.name === "__root.tsx" || entry.name === "client.tsx") continue;

    const isClient = entry.name.startsWith("client.");
    const sourceName = entry.name;
    const isAdmin = !isClient;
    if (!isAdmin && !isClient) continue;
    if (isClient && connectedClientRoutes.has(sourceName.slice("client.".length))) continue;

    const destination = isClient
      ? path.join(clientRoutesRoot, sourceName.slice("client.".length))
      : path.join(
          routesRoot,
          sourceName === "index.tsx" ? "connect.admin.index.tsx" : `connect.admin.${sourceName}`,
        );
    if (isAdmin && connectedAdminRouteFiles.has(path.basename(destination))) continue;
    const input = await readFile(path.join(sourceRoutes, sourceName), "utf8");
    const transformed = transformSource(
      transformRouteSource(input, isClient ? "client" : "admin"),
      componentNames,
    );
    await writeFile(destination, transformed, "utf8");
  }
}

function transformSource(source, componentNames) {
  let result = source;

  for (const name of componentNames) {
    result = result.replaceAll(
      `@/components/${name}`,
      `@/features/connect/flow-manager-ui/components/${name}`,
    );
  }

  for (const name of ["format", "mock-client", "mock-data", "mock-enterprise", "mock-extra"]) {
    result = result.replaceAll(
      `@/lib/${name}`,
      `@/features/connect/flow-manager-ui/preview-data/${name}`,
    );
  }

  result = result.replaceAll(
    'from "sonner"',
    'from "@/features/connect/flow-manager-ui/preview-toast"',
  );

  result = replaceRoutePrefix(result, "client", "/connect/client");
  for (const root of adminRoots) {
    result = replaceRoutePrefix(result, root, `/connect/admin/${root}`);
  }

  result = result
    .replaceAll('url: "/"', 'url: "/connect/admin"')
    .replaceAll('to="/"', 'to="/connect/admin"')
    .replaceAll('go("/")', 'go("/connect/admin")')
    .replaceAll('className="px-4 sm:px-6 pb-10"', 'className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10"')
    .replaceAll("<Tabs defaultValue=", '<Tabs className="min-w-0" defaultValue=')
    .replaceAll("<TabsList>", '<TabsList className="max-w-full justify-start overflow-x-auto">')
    .replaceAll(
      'className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"',
      'className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"',
    )
    .replaceAll(
      'url === "/" ? pathname === "/"',
      'url === "/connect/admin" ? pathname === "/connect/admin"',
    );

  return result;
}

function transformRouteSource(source, workspace) {
  return source.replace(/createFileRoute\("([^"]+)"\)/g, (_match, routePath) => {
    if (workspace === "client") {
      const suffix = routePath.slice("/client".length);
      return `createFileRoute("/connect/client${suffix}")`;
    }

    return routePath === "/"
      ? 'createFileRoute("/connect/admin/")'
      : `createFileRoute("/connect/admin${routePath}")`;
  });
}

function replaceRoutePrefix(source, routeRoot, replacement) {
  for (const quote of ['"', "'", "`"]) {
    source = source.replaceAll(`${quote}/${routeRoot}`, `${quote}${replacement}`);
  }
  return source;
}
