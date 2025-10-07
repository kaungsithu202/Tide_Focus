//     return res
//       .status(200)
//       .json({ id: user.id, name: user.name, email: user.email });
//   })

import prisma from "../config/db.ts";
import EntityNotFoundError from "../errors/EntityNotFoundError.ts";

export async function currentUserService({ userId }: { userId: number }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new EntityNotFoundError("User not found");
  }

  const userDetail = { id: user.id, name: user.name, email: user.email };

  return userDetail;
}
