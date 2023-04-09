# [参考](https://www.prisma.io/blog/nestjs-prisma-rest-api-7D056s1BmOL0#generate-the-nestjs-project)

<details>
<summary>part 1</summary>

install

```
yarn add -D prisma
yarn add @nestjs/swagger swagger-ui-express
```

# prisma

### 定義したモデルスキーマを元にテーブルを生成したい

```
npx prisma migrate dev --name init
```

### モデルスキーマの変更を反映したテーブルを生成をしたい

```
npx prisma migrate dev --name "<変更内容の名前>"
```

### 定義したモデルスキーマを DB にマイグレートしなおしたい

```
npx prisma migrate reset
```

### PrismaClient の定義がありません、みたいなことを言われて import できない

[docs](https://www.prisma.io/docs/concepts/components/prisma-client#2-installation)

```
npx prisma generate
```

# この Project での Entity の理解

Prisma を使用しているので swagger のメタデータの保存場所などと覚えておいたらいい

</details>

<details>
<summary>part 2</summary>

install

```
yarn add class-validator class-transformer
```

```
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```

送信されたデータ(DTO)からアプリケーションに必要なものだけバリデーションし不必要なバリデーションすらせずに無視するすることで意図しないエラーを回避できセキュリティ面が向上する

Pipe を使用し意図した型で引数に渡すことができ、swagger にも意図した型で記載されるようになりドキュメントとしての役割をしっかり担えるようになる

```
@Delete(':id')
@ApiOkResponse({ type: ArticleEntity })
remove(@Param('id') id: string) { // swaggerにidはstringとして記載される
  return this.articlesService.remove(+id);
}
```

しかし実際は Int(number)なので上記のままではドキュメントとして間違っている

```
model Article {
  id          Int      @id @default(autoincrement())
  title       String   @unique
  // ...
}
```

以下のように Pipe(ParseIntPipe)を使用することによって受け取ったデータを変換することで正しいドキュメントを記載できるようになる

```
@Delete(':id')
@ApiOkResponse({ type: ArticleEntity })
remove(@Param('id', ParseIntPipe) id: number) { // swaggerにidはnumberとして記載される
  return this.articlesService.remove(id);
}
```

</details>
<details>
<summary>part 3</summary>

NotFoundException で error をカスタマイズできる

```
@Get(':id')
@ApiOkResponse({ type: ArticleEntity })
async findOne(@Param('id', ParseIntPipe) id: number) {
  const article = await this.articlesService.findOne(id);
  if (!article) {
    throw new NotFoundException(`Article with ${id} does not exist.`);
  }
  return article;
}
```

prisma のエラーカスタマイズ

```
npx nest generate filter prisma-client-exception

```

prisma-client-exception.filter.ts が生成される
以下に書き換える

```
import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    console.error(exception.message);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const message = exception.message.replace(/\n/g, '');

    switch (exception.code) {
      case 'P2002': {
        const status = HttpStatus.CONFLICT;
        response.status(status).json({
          statusCode: status,
          message: message,
        });
        break;
      }
      default:
        // default 500 error code
        super.catch(exception, host);
        break;
    }
  }
}

```

</details>
<details>
<summary>part 4</summary>

main.ts に以下を追記することでインターセプターを実装できる

```
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
```

そして class-transformer と組み合わせることでレスポンスから除外できる

```

export class UserEntity implements User {
  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial); // UserEntityの形で返せるようになる
  }

  @ApiProperty()
  id: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @Exclude() //<- レスポンスから除外されるようになる
  password: string;
}
```

```
@Get(':id')
@ApiOkResponse({ type: UserEntity })
async findOne(@Param('id', ParseIntPipe) id: number) {
  return new UserEntity(await this.usersService.findOne(id));
}
```

このように変更することで UserEntity のオブジェクトで返せるようになり password が返されなくなる

</details>
<details>
<summary>part 5</summary>

install

```
yarn add @nestjs/passport passport @nestjs/jwt passport-jwt
yarn add -D @types/passport-jwt

```

auth.module.ts

```
//src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';

export const jwtSecret = 'zjP9h6ZI5LoSKCRj';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '5m' }, // e.g. 30s, 15m, 24h, 7d,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}

```

</details>
