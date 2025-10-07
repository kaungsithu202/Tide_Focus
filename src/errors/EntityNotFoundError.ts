import CustomError from "./CustomError.ts";

class EntityNotFoundError extends CustomError<"ERR_NF"> {
  constructor(message = "Entity not found") {
    super({
      message,
      statusCode: 404,
      code: "ERR_NF",
    });
  }
}

export default EntityNotFoundError;
