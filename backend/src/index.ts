import { createApp } from "./app";
import { connectDB } from "./db";

const PORT = Number(process.env.PORT ?? 4000);
const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }
  await connectDB(MONGODB_URI);

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
