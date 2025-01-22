from telethon import TelegramClient, events
import re
import asyncio

# Replace these with your own values
api_id = "24344346"
api_hash = "0ae609349ce85cf9f39c8af6c3e35c60"
phone_number = "+380732976199"

# Create the client and connect
client = TelegramClient('session_name', api_id, api_hash)

# Store the pending requests
pending_requests = {}

async def main():
    await client.start(phone=phone_number)

    # Listen for messages from Bot 1
    @client.on(events.NewMessage(chats='@Lismanuga'))
    async def handle_bot1_message(event):
        message = event.message.message
        # Extract token using regex (assuming token is alphanumeric)
        token_match = re.search(r'[A-Za-z0-9]{32,}', message)

        if token_match:
            token = token_match.group(0)
            chat_id = event.chat_id

            # Store the original chat id to reply later
            pending_requests[token] = chat_id

            # Forward to Bot 2 with the command
            target_chat = '@Lismanuga'
            command = f'@Lismanuga analyze {token}'

            await client.send_message(target_chat, command)
            print(f'Sent token {token} to Bot 2')

    # Listen for responses from Bot 2
    @client.on(events.NewMessage(chats='@Lismanuga'))
    async def handle_bot2_response(event):
        message = event.message.message

        # Extract token from the response
        token_match = re.search(r'[A-Za-z0-9]{32,}', message)

        if token_match:
            token = token_match.group(0)
            if token in pending_requests:
                # Get the original chat ID
                original_chat_id = pending_requests[token]

                # Send the response back to Bot 1
                await client.send_message(original_chat_id, message)
                print(f'Sent response for token {token} back to Bot 1')

                # Clean up the pending request
                del pending_requests[token]

    print("Bot is running...")
    await client.run_until_disconnected()

if __name__ == "__main__":
    with client:
        client.loop.run_until_complete(main())