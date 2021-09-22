function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds *1000));
}

export async function deleteMessage(message, seconds) {
    await sleep(seconds); // wait some seconds until the program

    // deletes the message
    message.delete()
}
