export const STATUS_PRIORITY = {
  failed: -1,
  sending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

export function resolveMessageStatus(oldStatus, newStatus) {
  if (!oldStatus) return newStatus || "sent";
  if (!newStatus) return oldStatus;
  if (newStatus === "failed") return newStatus;
  const oldPriority = STATUS_PRIORITY[oldStatus] ?? 1;
  const newPriority = STATUS_PRIORITY[newStatus] ?? 1;
  return newPriority >= oldPriority ? newStatus : oldStatus;
}

export function appendUniqueMessage(existingMessages, message) {
  if (!message) return existingMessages || [];
  const list = Array.isArray(existingMessages) ? existingMessages : [];

  const targetId = message._id ? String(message._id) : null;
  const targetLocalId =
    message.localId ||
    (targetId && targetId.startsWith("local-") ? targetId : null);

  let replaced = false;

  const updatedMessages = list.map((item) => {
    const itemId = item._id ? String(item._id) : null;
    const itemLocalId =
      item.localId ||
      (itemId && itemId.startsWith("local-") ? itemId : null);

    // 1. Match by localId / clientTempId
    const matchByLocalId = Boolean(
      (targetLocalId && itemLocalId && targetLocalId === itemLocalId) ||
        (targetLocalId && itemId && targetLocalId === itemId) ||
        (message.localId && item._id && message.localId === String(item._id))
    );

    // 2. Match by MongoDB _id (if neither is a local placeholder)
    const matchById = Boolean(
      targetId &&
        itemId &&
        targetId === itemId &&
        !targetId.startsWith("local-")
    );

    // 3. Match by optimistic content (senderId + text + time) when replacing a local placeholder
    const matchByOptimistic = Boolean(
      itemLocalId &&
        !targetId?.startsWith("local-") &&
        String(item.senderId || "") === String(message.senderId || "") &&
        item.text === message.text &&
        item.time === message.time
    );

    if (matchByLocalId || matchById || matchByOptimistic) {
      replaced = true;
      return {
        ...item,
        ...message,
        _id:
          targetId && !targetId.startsWith("local-")
            ? targetId
            : item._id || targetId,
        localId: targetLocalId || itemLocalId,
        status: resolveMessageStatus(item.status, message.status),
      };
    }

    return item;
  });

  if (replaced) {
    return updatedMessages;
  }

  return [...list, message];
}

export function getMessageTimestamp(message) {
  if (!message) {
    return null;
  }

  const raw = message.createdAt || message.timestamp || null;

  if (!raw) {
    return null;
  }

  const parsed = raw instanceof Date ? raw : new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function getLocalDateKey(date) {
  const parsed = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatMessageDateLabel(date, now = new Date()) {
  const parsed = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const todayKey = getLocalDateKey(now);
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  const messageKey = getLocalDateKey(parsed);

  if (messageKey === todayKey) {
    return "Today";
  }

  if (messageKey === getLocalDateKey(yesterday)) {
    return "Yesterday";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMessageClockTime(message) {
  const timestamp = getMessageTimestamp(message);

  if (timestamp) {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return message?.time || "";
}

export function shouldShowDateSeparator(messages, index) {
  const current = getMessageTimestamp(messages?.[index]);

  if (!current) {
    return false;
  }

  if (index === 0) {
    return true;
  }

  const previous = getMessageTimestamp(messages[index - 1]);

  if (!previous) {
    return true;
  }

  return getLocalDateKey(current) !== getLocalDateKey(previous);
}

