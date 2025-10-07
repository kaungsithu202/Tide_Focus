import CustomError from "./CustomError.ts";

class UnauthorizedError extends CustomError<"ERR_UNAUTHORIZED"> {
  constructor(message = "Unauthorized") {
    super({
      message,
      statusCode: 401,
      code: "ERR_UNAUTHORIZED",
    });
  }
}

export default UnauthorizedError;
