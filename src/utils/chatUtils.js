export function appendUniqueMessage(existingMessages, message) {
  const alreadyExists = existingMessages.some((item) => {
    const sameId =
      item._id && message._id && String(item._id) === String(message._id);
    const sameTextTime =
      item.text &&
      message.text &&
      item.text === message.text &&
      item.time === message.time;

    return sameId || sameTextTime;
  });

  if (alreadyExists) {
    return existingMessages;
  }

  return [...existingMessages, message];
}
