import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const REGISTER_URL = `${BASE_URL}/api/users/register`;
const LOGIN_URL = `${BASE_URL}/api/users/login`;

const PASSWORD = __ENV.PASSWORD || "Password123!";

export const options = {
  stages: [
    { duration: "30s", target: 100 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<500"],
  },
};

function jsonHeaders() {
  return { headers: { "Content-Type": "application/json" } };
}

function uniqueUsername() {
  // Always unique: include VU + ITER + timestamp + random
  return `k6_${__VU}_${__ITER}_${Date.now()}_${Math.floor(
    Math.random() * 1e9
  )}`;
}

export default function () {
  // REGISTER with a unique username
  let username = uniqueUsername();
  let regRes;

  // Small retry loop in case a collision err somehow happens (409)
  for (let attempt = 0; attempt < 3; attempt++) {
    const regPayload = JSON.stringify({
      username,
      plain_password: PASSWORD,
    });

    regRes = http.post(REGISTER_URL, regPayload, jsonHeaders());

    if (regRes.status === 201) break;
    if (regRes.status === 409) {
      username = uniqueUsername();
      continue;
    }
    break;
  }

  check(regRes, {
    "register: status 201": (r) => r && r.status === 201,
  });

  if (!regRes || regRes.status !== 201) {
    sleep(0.2);
    return;
  }

  // LOGIN using the same user just created (always tests /login too)
  const loginPayload = JSON.stringify({
    username,
    // In your Rust handler: LoginUser has `plain_password`
    plain_password: PASSWORD,
  });

  const loginRes = http.post(LOGIN_URL, loginPayload, jsonHeaders());

  check(loginRes, {
    "login: status 200": (r) => r.status === 200,
    "login: has token": (r) => {
      try {
        const j = r.json();
        return typeof j.token === "string" && j.token.length > 10;
      } catch (_) {
        return false;
      }
    },
  });

  sleep(0.2);
}
