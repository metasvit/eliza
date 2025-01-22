from telethon import TelegramClient, events
import re
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Replace these with your own values from environment variables
api_id = os.getenv("API_ID")
api_hash = os.getenv("API_HASH")
phone_number = os.getenv("PHONE_NUMBER")

# Create the client and connect
client = TelegramClient('session_name', api_id, api_hash)

# Store the pending requests
pending_requests = {}

async def send_message_with_timeout(target_chat, command, token, timeout=10):
    try:
        await asyncio.wait_for(client.send_message(target_chat, command), timeout)
        print(f'Sent command to Bot 2 for token {token}')
    except asyncio.TimeoutError:
        print(f'Timeout while sending message to Bot 2 for token {token}')

async def main():
    await client.start(phone=phone_number)

    # Check if the bot can access a known chat
    try:
        chat = await client.get_input_entity('@my_channel')  # Replace with a known channel username
        print(f"Successfully accessed chat: {chat}")
    except Exception as e:
        print(f"Error accessing chat: {e}")

    # Check if the bot can access the target chat
    try:
        chat = await client.get_input_entity('2393633389')  # Replace with the correct chat ID or username
        print(f"Successfully accessed chat: {chat}")
    except Exception as e:
        print(f"Error accessing chat: {e}")

    # Listen for messages from Bot 1
    @client.on(events.NewMessage(chats='@Lismanuga'))
    async def handle_bot1_message(event):
        message = event.message.message
        print(f"Received message from Bot 1: {message}")  # Debugging log

        # Extract token using regex (assuming token is alphanumeric)
        token_match = re.search(r'[A-Za-z0-9]{32,}', message)

        if token_match:
            token = token_match.group(0)
            chat_id = event.chat_id

            # Store the original chat id to reply later
            pending_requests[token] = chat_id

            # Forward to Bot 2 with the command
            target_chat = '@prepotente_irreale'  # Use the bot's username
            command = f'@AgentScarlettBot analyze {token}'

            await send_message_with_timeout(target_chat, command, token)
        else:
            print("No token found in the message")  # Debugging log

    # Listen for responses from Bot 2
    @client.on(events.NewMessage(chats='@prepotente_irreale'))  # Use the bot's username
    async def handle_bot2_response(event):
        print("Received a response from Bot 2")  # Debugging log

        message = event.message  # Get the entire message object
        print(f"Message content from Bot 2: {message}")  # Debugging log

        # Check if the message is a response to your bot or a reply to a previous message
        if message.mentioned or message.reply_to:  # Check if the message mentions your bot or is a reply
            # Directly send the response back to Bot 1
            if pending_requests:
                original_chat_id = list(pending_requests.values())[-1]  # Get the last chat ID
                print(f"Sending response to original chat ID: {original_chat_id}")  # Debugging log

                # Check if the message has any content
                if message:
                    await client.send_message(original_chat_id, message)  # Send the entire message object
                    print(f'Sent response back to Bot 1')
                else:
                    print("Received an empty message from Bot 2")  # Debugging log
        else:
            print("Received a message that is not a response to our request")  # Debugging log

    print("Bot is running...")
    await client.run_until_disconnected()

if __name__ == "__main__":
    with client:
        client.loop.run_until_complete(main())