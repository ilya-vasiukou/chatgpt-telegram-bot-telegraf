# Базовый образ Node.js версии 18
FROM node:18

# Директория приложения в контейнере
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm install

# Копируем все остальные файлы проекта
COPY . .

# Команда запуска бота
CMD ["npm", "run", "start"]
