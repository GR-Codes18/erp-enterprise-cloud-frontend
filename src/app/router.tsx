import { createBrowserRouter, type RouteObject } from "react-router";
import { AuthorizedLayout } from "@/app/AuthorizedLayout";
import { HomeRedirect } from "@/app/HomeRedirect";
import { RequirePermission } from "@/app/RequirePermission";
import { appModules } from "@/config/modules";
import PlaceholderPage from "@/shared/components/PlaceholderPage";
import ForbiddenPage from "@/shared/pages/ForbiddenPage";
import NotFoundPage from "@/shared/pages/NotFoundPage";
import ProtectedRoute from "@/modules/auth/components/ProtectedRoute";
import LoginPage from "@/modules/auth/pages/LoginPage";
import type { AppModule, PageLoader } from "@/shared/types/module";

function toRoute(path: string, label: string, page?: PageLoader, permission?: string): RouteObject {
  const route: RouteObject = page
    ? { path, lazy: async () => ({ Component: (await page()).default }) }
    : { path, element: <PlaceholderPage title={label} /> };

  if (!permission) return route;
  // La guardia envuelve la pantalla: sin permiso se redirige a /403 antes de cargarla
  return { element: <RequirePermission permission={permission} />, children: [route] };
}

/** "new" exige crear, ":id/edit" editar y el resto (detalle) ver, salvo que la subruta declare el suyo */
function subRoutePermission(itemPermission: string | undefined, subPath: string): string | undefined {
  if (!itemPermission) return undefined;
  const screen = itemPermission.split(":")[0];
  if (subPath === "new") return `${screen}:create`;
  if (subPath.endsWith("/edit")) return `${screen}:edit`;
  return itemPermission;
}

function moduleToRoute(module: AppModule): RouteObject {
  if (!module.sections) {
    return toRoute(module.basePath, module.label, module.page, module.permission);
  }

  const items = module.sections.flatMap((section) => section.items);
  const childRoutes: RouteObject[] = [];

  if (items.length > 0) {
    // La raíz del módulo lleva a su primera pantalla permitida
    childRoutes.push({ index: true, element: <HomeRedirect modules={[module]} /> });
  }

  for (const item of items) {
    childRoutes.push(toRoute(item.path, item.label, item.page, item.permission));

    if (item.subRoutes) {
      for (const sub of item.subRoutes) {
        const fullSubPath = `${item.path}/${sub.path}`;
        const permission = sub.permission ?? subRoutePermission(item.permission, sub.path);
        childRoutes.push(toRoute(fullSubPath, sub.label, sub.page, permission));
      }
    }
  }

  return {
    path: module.basePath,
    children: childRoutes,
  };
}

const routes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AuthorizedLayout modules={appModules} />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <HomeRedirect modules={appModules} /> },
      ...appModules.map(moduleToRoute),
      { path: "403", element: <ForbiddenPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
