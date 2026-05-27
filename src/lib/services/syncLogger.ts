import { prisma } from "@/lib/prisma";
import { SyncType } from "@/generated/prisma/client";

/**
 * Wraps a sync function with ApiSyncLog creation.
 * Creates a PENDING log, runs fn, updates to SUCCESS or FAILED.
 */
export async function withSyncLog<T>(
  syncType: SyncType,
  fn: (incrementRequests: () => void) => Promise<T>
): Promise<T> {
  const log = await prisma.apiSyncLog.create({
    data: { syncType, status: "PENDING" },
  });

  let requestCount = 0;
  const increment = () => {
    requestCount++;
  };

  try {
    const result = await fn(increment);
    await prisma.apiSyncLog.update({
      where: { id: log.id },
      data: { status: "SUCCESS", finishedAt: new Date(), requestCount },
    });
    return result;
  } catch (err) {
    await prisma.apiSyncLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        requestCount,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}

/**
 * Returns the last successful sync log for a given type.
 */
export async function getLastSuccessfulSync(syncType: SyncType) {
  return prisma.apiSyncLog.findFirst({
    where: { syncType, status: "SUCCESS" },
    orderBy: { finishedAt: "desc" },
  });
}
