import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const users = new SharedArray("users", function () {
  return JSON.parse(open("./data/users.json")).map((user) => {
    return {
      username: user.username,
      password: user.password,
    };
  });
});

export const options = {
  stages: [
    { duration: "30s", target: 100 }, // ramp up to 100 users
    { duration: "1m", target: 100 }, // stay at 100 users
    { duration: "30s", target: 0 }, // ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests must complete below 500ms
  },
};

export default function () {
  const user = users[Math.floor(Math.random() * users.length)];

  const loginRes = http.post("http://localhost:8080/api/users/login", {
    username: user.username,
    password: user.password,
  });

  check(loginRes, {
    "login successful": (r) => r.status === 200,
  });

  sleep(1);
}
