import dotenv from "dotenv";
import express from "express";
import prisma from "./config/db";
import errorHandler from "./middleware/errorHandler";
import routes from "./routes/index";
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

const allowedOrigins = [
  "http://localhost:3005",
  "https://tide-focus-web.vercel.app/",
];
//

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(routes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
