import dotenv from "dotenv";
import express from "express";
import prisma from "./config/db.ts";
import errorHandler from "./middleware/errorHandler.ts";
import routes from "./routes/index.ts";
import cors from "cors";
import cookieParser from "cookie-parser";

async function main() {}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

dotenv.config();
const port = 4000;

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:3005", credentials: true }));
app.use(routes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
