import CustomError from "./CustomError";

class BadRequestError extends CustomError<"ERR_BAD_REQUEST"> {
  constructor(message = "Bad request") {
    super({
      message,
      statusCode: 400,
      code: "ERR_BAD_REQUEST",
    });
  }
}

export default BadRequestError;
