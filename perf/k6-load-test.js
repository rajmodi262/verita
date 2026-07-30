// Verita — k6 load test
// Measures throughput and latency of the FastAPI backend under concurrent load.
//
//   Run:  k6 run perf/k6-load-test.js
//   Against a deployed host:  BASE_URL=https://api.example.com k6 run perf/k6-load-test.js
//
// The test ramps to 50 virtual users and fails the run if the p95 latency
// exceeds 400 ms or the error rate exceeds 1% — a concrete scalability gate.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");
const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // warm-up
    { duration: "1m", target: 50 },  // ramp to 50 concurrent users
    { duration: "1m", target: 50 },  // sustained load
    { duration: "30s", target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<400"], // 95th percentile under 400 ms
    errors: ["rate<0.01"],            // < 1% errors
  },
};

export default function () {
  // Health/liveness — cheap, exercises the app and middleware stack.
  const health = http.get(`${BASE_URL}/health`);
  check(health, { "health 200": (r) => r.status === 200 }) || errorRate.add(1);

  // OpenAPI schema — exercises route table generation without side effects.
  const schema = http.get(`${BASE_URL}/openapi.json`);
  check(schema, {
    "schema 200": (r) => r.status === 200,
    "schema is json": (r) => r.headers["Content-Type"]?.includes("json"),
  }) || errorRate.add(1);

  sleep(1);
}
