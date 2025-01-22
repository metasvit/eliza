from telethon import TelegramClient, events

# Replace these with your own values
api_id = "24344346"
api_hash = "0ae609349ce85cf9f39c8af6c3e35c60"
phone_number = "+380732976199"

# Create the client and connect
client = TelegramClient('session_name', api_id, api_hash)

async def main():
    await client.start(phone=phone_number)

    # Listen for new messages in a specific chat
    @client.on(events.NewMessage(chats='@Lismanuga'))
    async def handler(event):
        message = event.message.message
        print(f'New message: {message}')
        # Here you can add your parsing logic

    print("Listening for new messages...")
    await client.run_until_disconnected()

if __name__ == "__main__":
    with client:
        client.loop.run_until_complete(main())