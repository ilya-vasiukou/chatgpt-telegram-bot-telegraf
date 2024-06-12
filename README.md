# ChatGPT Telegram Bot via Telegraf

ChatGPT Telegram Bot via Telegraf is an advanced Telegram bot designed to provide seamless text and voice interactions using OpenAI's ChatGPT. Built with the Telegraf framework, this bot allows users to ask ChatGPT questions via voice messages and receive text responses. Ideal for enhancing user engagement, customer support, and more, this bot leverages PostgreSQL for data storage and can integrate with Pinecone vector database to improve the quality of answers by utilizing long-term memory.

## Features

- **Text and Voice Message Processing**: Handles both text and voice messages, converting voice to text for processing.
- **OpenAI's ChatGPT Integration**: Utilizes the powerful ChatGPT model to generate responses.
- **Docker Support**: Easily deployable using Docker.
- **PostgreSQL Database**: Stores user data and interactions in a PostgreSQL database.
- **Pinecone Integration**: Optional long-term memory support using Pinecone.

## Configuration

1. Clone the repository:

    ```bash
    git clone https://github.com/kirill-markin/chatgpt-telegram-bot-telegraf.git
    cd chatgpt-telegram-bot-telegraf
    ```

2. Copy the `.env.example` file to `.env` and fill in the required values:

    ```bash
    cp .env.example .env
    ```

3. Open the `.env` file and configure the following variables:

    ```env
    TELEGRAM_BOT_TOKEN=replace_with_your_telegram_bot_token
    OPENAI_API_KEY=replace_with_your_openai_api_key
    DATABASE_URL=replace_with_your_database_url
    SETTINGS_PATH=./settings/private_en.yaml

    # Only if you want to use Pinecone for Long-Term Memory
    PINECONE_API_KEY=replace_with_your_pinecone_api_key
    PINECONE_INDEX_NAME=replace_with_your_pinecone_index_name
    ```

4. Adjust the settings in `settings/private_en.yaml` as needed.

## Deploy with Docker Compose

1. Ensure Docker Compose is installed on your machine.
2. Start the services:

    ```bash
    docker-compose up -d
    ```

## Running with Docker

1. Build and run the Docker container:

    ```bash
    docker build -t chatgpt-telegram-bot-telegraf .
    docker run --rm -it chatgpt-telegram-bot-telegraf
    ```

## Installing and Running Locally

### Requisites

Ensure you have met the following requirements:

- Node.js and npm installed
- PostgreSQL database
- OpenAI API key
- Pinecone API key (optional)

### Steps

1. Clone the repository:

    ```bash
    git clone https://github.com/kirill-markin/chatgpt-telegram-bot-telegraf.git
    cd chatgpt-telegram-bot-telegraf
    ```

2. Copy the `.env.example` file to `.env` and fill in the required values:

    ```bash
    cp .env.example .env
    ```

3. Open the `.env` file and configure the following variables

4. Install the dependencies:

    ```bash
    npm install
    ```

5. Start the bot:

    ```bash
    npm start
    ```

## Running Tests

1. To run the tests, use the following command:

    ```bash
    npm test
    ```

## Table Entities Description

- The `users` table stores information about the bot users.
- The `messages` table stores the messages exchanged between users and the bot.
- The `events` table logs various events related to user interactions and bot operations.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
