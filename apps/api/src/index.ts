import { buildApp } from "./app.js";
import { env } from "./lib/env.js";

const app = buildApp();
app.listen(env.API_PORT, () => {
  console.log(`API listening on http://localhost:${env.API_PORT}`);
});
