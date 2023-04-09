// src/main.ts

import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { PrismaClientExceptionFilter } from './prisma-client-exception/prisma-client-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * validationの設定
   * whitelist: true とはDTOに定義していないものは自動的に無視する
   * */
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  /**
   * インターセプターの設定
   * リクエスト -> レスポンス の処理の間に処理を挟むこと
   * リクエスト -> インターセプター -> レスポンス
   * */
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // swaggerの設定
  const config = new DocumentBuilder()
    .setTitle('Median')
    .setDescription('The Median API description')
    .setVersion('0.1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // エラーカスタマイズ
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  await app.listen(3000);
}
bootstrap();
