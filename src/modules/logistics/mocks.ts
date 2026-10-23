import { delay, http, HttpResponse, type RequestHandler } from "msw"
import { env } from "@/config/env"
import { createCrudHandlers } from "@/mocks/utils/crud"

interface LogisticsRecord {
  id: string
  [key: string]: unknown
}

const resource = (path: string) => `logistics/${path}`

const withActionHandlers = (...paths: string[]): RequestHandler[] =>
  paths.flatMap((path) => [
    http.post(`${env.apiBaseUrl}/${resource(path)}/:id/:action`, async ({ params }) => {
      await delay(150)
      return HttpResponse.json({
        id: params.id,
        action: params.action,
        status: "ok",
      })
    }),
  ])

const logisticsCrud = (...paths: string[]): RequestHandler[] =>
  paths.flatMap((path) =>
    createCrudHandlers<LogisticsRecord>({
      resource: resource(path),
      seed: [],
      searchFields: ["number", "route_number", "dispatch_number", "customer_name", "status", "code"],
      filterFields: ["status"],
      latency: 200,
    }),
  )

export const logisticsHandlers: RequestHandler[] = [
  ...logisticsCrud(
    "despatches",
    "routes",
    "vehicle-assignments",
    "driver-assignments",
    "tracking",
    "delivery-confirmations",
    "route-returns",
    "route-costs",
  ),
  ...withActionHandlers(
    "despatches",
    "routes",
    "vehicle-assignments",
    "driver-assignments",
    "tracking",
    "delivery-confirmations",
    "route-returns",
    "route-costs",
  ),
]
