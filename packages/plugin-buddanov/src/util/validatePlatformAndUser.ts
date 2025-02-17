import { elizaLogger } from "@elizaos/core";
import { Memory } from "@elizaos/core";

export async function validatePlatformAndUser(message: Memory): Promise<boolean> {
    const allowedUserIds = process.env.ALLOWED_USER_IDS?.split(',') || []; // Split the environment variable into an array
    const currentUserId = message.userId;
    const sourcePlatform = message.content.source;

    if (sourcePlatform !== "telegram") {
        elizaLogger.log(`Unauthorized platform access attempt from source: ${sourcePlatform}`);
        return false;
    }

    if (!allowedUserIds.includes(currentUserId)) {
        elizaLogger.log(`Unauthorized user access attempt from user ID: ${currentUserId}`);
        return false;
    }

    return true;
}