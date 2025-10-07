import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import prisma from "./config/db.ts";
import errorHandler from "./middleware/errorHandler.ts";
import routes from "./routes/index.ts";

dotenv.config();

const app = express();

const port = 3000;

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

app.use(express.json());
app.use(routes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
