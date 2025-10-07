import CustomError from "./CustomError.ts";

class InternalServerError extends CustomError<"ERR_INTERNAL_SERVER"> {
  constructor(message = "Internal Server Error") {
    super({
      message,
      statusCode: 500,
      code: "ERR_INTERNAL_SERVER",
    });
  }
}

export default InternalServerError;
