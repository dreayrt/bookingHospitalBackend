import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true, // Phản hồi lại origin của client (hỗ trợ cả Vercel, localhost, ngrok)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, ngrok-skip-browser-warning',
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
