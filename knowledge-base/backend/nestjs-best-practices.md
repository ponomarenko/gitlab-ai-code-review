# NestJS Best Practices

## Core Principles

### Module Organization

**Good: Feature-based modules**
```typescript
// users/users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}

// Folder structure
src/
├── users/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── entities/
│   │   └── user.entity.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.module.ts
│   └── users.controller.spec.ts
```

**Bad: Flat structure**
```typescript
// ❌ Don't organize by type
src/
├── controllers/
│   ├── users.controller.ts
│   ├── posts.controller.ts
├── services/
│   ├── users.service.ts
│   ├── posts.service.ts
```

### Dependency Injection

**Good: Constructor injection with proper types**
```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  async findOne(id: string): Promise<User> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
```

**Bad: Property injection or global state**
```typescript
// ❌ Avoid property injection
@Injectable()
export class UsersService {
  @InjectRepository(User)
  private usersRepository: Repository<User>;
}

// ❌ Never use global state
const globalCache = new Map(); // Don't do this
```

## Controllers

### RESTful Design

**Good: Proper HTTP methods and status codes**
```typescript
@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  async findAll(
    @Query() query: PaginationDto,
  ): Promise<PaginatedResponse<User>> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
```

**Bad: Inconsistent routes and methods**
```typescript
// ❌ Don't mix conventions
@Controller('users')
export class UsersController {
  @Get('getUserById/:id') // Bad route naming
  getUser(@Param('id') id: string) {}

  @Post('deleteUser') // Wrong HTTP method for deletion
  deleteUser(@Body() data: any) {} // Using 'any'
}
```

### Request Validation

**Good: Use DTOs with class-validator**
```typescript
// create-user.dto.ts
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;
}

// update-user.dto.ts
import { PartialType } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

**Enable validation globally:**
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  await app.listen(3000);
}
```

## Services (Business Logic)

### Single Responsibility

**Good: Focused, testable services**
```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly eventsService: EventsService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Hash password
    const hashedPassword = await this.passwordService.hash(
      createUserDto.password,
    );

    // Create user
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // Save to database
    const savedUser = await this.usersRepository.save(user);

    // Emit event
    this.eventsService.emit('user.created', savedUser);

    return savedUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  private async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }
}
```

### Error Handling

**Good: Custom exceptions with proper error messages**
```typescript
// common/exceptions/business.exception.ts
export class BusinessException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        statusCode,
        message,
        error: 'BusinessError',
      },
      statusCode,
    );
  }
}

// Use in service
@Injectable()
export class OrdersService {
  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const product = await this.productsService.findOne(
      createOrderDto.productId,
    );

    if (product.stock < createOrderDto.quantity) {
      throw new BusinessException(
        `Insufficient stock. Available: ${product.stock}, Requested: ${createOrderDto.quantity}`,
        HttpStatus.CONFLICT,
      );
    }

    // Create order logic...
  }
}

// Global exception filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = 
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message;
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

## Guards and Authentication

### JWT Authentication

**Good: Proper JWT strategy and guards**
```typescript
// auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return {
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles,
    };
  }
}

// auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}

// auth/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// Usage in controller
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles(Role.Admin, Role.SuperAdmin)
  async getAllUsers() {
    // Only admins can access this
  }
}
```

## Interceptors

### Logging and Transformation

**Good: Clean interceptors with proper use**
```typescript
// common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;
        
        this.logger.log(
          `${method} ${url} ${response.statusCode} ${delay}ms`,
        );
      }),
    );
  }
}

// common/interceptors/transform.interceptor.ts
export interface Response<T> {
  data: T;
  meta?: {
    timestamp: string;
    path: string;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      })),
    );
  }
}

// Apply globally
app.useGlobalInterceptors(
  new LoggingInterceptor(logger),
  new TransformInterceptor(),
);
```

## Configuration

### Environment-based Config

**Good: Type-safe configuration**
```typescript
// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
});

// config/config.validation.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
});

// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
})
export class AppModule {}

// Usage in service
@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getDatabaseHost(): string {
    return this.configService.get<string>('database.host');
  }
}
```

## Database (TypeORM)

### Entity Design

**Good: Proper entity with decorators**
```typescript
// entities/user.entity.ts
@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // Don't include in queries by default
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ type: 'enum', enum: Role, default: Role.User })
  role: Role;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date; // Soft delete

  // Relations
  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  // Virtual fields
  @Exclude() // Don't serialize this field
  @Column({ default: 0 })
  loginAttempts: number;
}

// Custom repository
@Injectable()
export class UsersRepository extends Repository<User> {
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findActiveUsers(): Promise<User[]> {
    return this.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }
}
```

### Query Optimization

**Good: Efficient queries with proper loading**
```typescript
@Injectable()
export class PostsService {
  // Eager loading with relations
  async findWithAuthor(id: string): Promise<Post> {
    return this.postsRepository.findOne({
      where: { id },
      relations: ['author'],
    });
  }

  // Query builder for complex queries
  async findPopularPosts(limit: number = 10): Promise<Post[]> {
    return this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .loadRelationCountAndMap('post.commentsCount', 'post.comments')
      .where('post.publishedAt IS NOT NULL')
      .orderBy('post.viewCount', 'DESC')
      .take(limit)
      .getMany();
  }

  // Pagination
  async findAll(paginationDto: PaginationDto): Promise<PaginatedResponse<Post>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [items, total] = await this.postsRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Transactions
  async createPostWithTags(
    createPostDto: CreatePostDto,
  ): Promise<Post> {
    return this.dataSource.transaction(async (manager) => {
      const post = manager.create(Post, createPostDto);
      await manager.save(post);

      const tags = await manager.find(Tag, {
        where: { id: In(createPostDto.tagIds) },
      });
      
      post.tags = tags;
      return manager.save(post);
    });
  }
}
```

## Testing

### Unit Tests

**Good: Comprehensive unit tests with mocks**
```typescript
// users.service.spec.ts
describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            hash: jest.fn().mockResolvedValue('hashedPassword'),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      jest.spyOn(repository, 'create').mockReturnValue(mockUser as User);
      jest.spyOn(repository, 'save').mockResolvedValue(mockUser as User);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(repository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashedPassword',
      });
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser as User);

      const result = await service.findOne('1');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### E2E Tests

**Good: Full integration tests**
```typescript
// users.e2e-spec.ts
describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'password' });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/users (POST)', () => {
    it('should create a new user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('newuser@example.com');
        });
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email',
          name: 'Test',
          password: 'pass',
        })
        .expect(400);
    });
  });
});
```

## Caching

### Redis Cache

**Good: Proper cache implementation**
```typescript
// cache.module.ts
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        ttl: 300, // 5 minutes default
      }),
    }),
  ],
  exports: [CacheModule],
})
export class CacheConfigModule {}

// Usage in service
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async findOne(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;
    
    // Check cache
    const cached = await this.cacheManager.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const product = await this.productsRepository.findOne({ 
      where: { id } 
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Store in cache
    await this.cacheManager.set(cacheKey, product, 600); // 10 minutes

    return product;
  }

  async update(id: string, updateDto: UpdateProductDto): Promise<Product> {
    const product = await this.productsRepository.save({
      id,
      ...updateDto,
    });

    // Invalidate cache
    await this.cacheManager.del(`product:${id}`);

    return product;
  }
}

// Custom cache interceptor
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = `http:${request.url}`;

    const cachedResponse = await this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheManager.set(cacheKey, response, 300);
      }),
    );
  }
}
```

## Microservices

### Message Queue (RabbitMQ/Redis)

**Good: Event-driven architecture**
```typescript
// app.module.ts
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NOTIFICATIONS_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'notifications_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
})
export class AppModule {}

// Producer (users service)
@Injectable()
export class UsersService {
  constructor(
    @Inject('NOTIFICATIONS_SERVICE')
    private readonly notificationsClient: ClientProxy,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.usersRepository.save(createUserDto);

    // Emit event
    this.notificationsClient.emit('user.created', {
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return user;
  }
}

// Consumer (notifications service)
@Controller()
export class NotificationsController {
  @EventPattern('user.created')
  async handleUserCreated(@Payload() data: any) {
    console.log('New user created:', data);
    // Send welcome email
    await this.emailService.sendWelcomeEmail(data.email);
  }

  @MessagePattern('get_notifications')
  async getNotifications(@Payload() userId: string) {
    return this.notificationsService.findByUser(userId);
  }
}
```

## Performance

### Query Optimization

**Good: Efficient database queries**
```typescript
// Bad: N+1 problem
async getPosts() {
  const posts = await this.postsRepository.find();
  
  for (const post of posts) {
    post.author = await this.usersRepository.findOne(post.authorId);
  }
  
  return posts;
}

// Good: Use eager loading
async getPosts() {
  return this.postsRepository.find({
    relations: ['author'],
  });
}

// Better: Use query builder with select
async getPosts() {
  return this.postsRepository
    .createQueryBuilder('post')
    .leftJoinAndSelect('post.author', 'author')
    .select([
      'post.id',
      'post.title',
      'post.content',
      'author.id',
      'author.name',
    ])
    .getMany();
}
```

### Compression

**Good: Enable response compression**
```typescript
// main.ts
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(compression());
  
  await app.listen(3000);
}
```

## Common Pitfalls

### ❌ Memory Leaks

**Bad:**
```typescript
// Don't store data in module/service instance
@Injectable()
export class CacheService {
  private cache = new Map(); // Memory leak!
  
  set(key: string, value: any) {
    this.cache.set(key, value);
  }
}
```

**Good:**
```typescript
// Use proper cache manager
@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) 
    private cacheManager: Cache
  ) {}
}
```

### ❌ Circular Dependencies

**Bad:**
```typescript
// users.service.ts
@Injectable()
export class UsersService {
  constructor(private postsService: PostsService) {}
}

// posts.service.ts
@Injectable()
export class PostsService {
  constructor(private usersService: UsersService) {}
}
```

**Good:**
```typescript
// Use forwardRef or extract shared logic
@Injectable()
export class UsersService {
  constructor(
    @Inject(forwardRef(() => PostsService))
    private postsService: PostsService,
  ) {}
}
```

### ❌ Not Using DTOs

**Bad:**
```typescript
@Post()
create(@Body() body: any) { // Using 'any'
  return this.service.create(body);
}
```

**Good:**
```typescript
@Post()
create(@Body() createDto: CreateUserDto) {
  return this.service.create(createDto);
}
```

## Security

### Input Sanitization

**Good: Prevent injection attacks**
```typescript
// Enable helmet
import helmet from 'helmet';
app.use(helmet());

// Rate limiting
import rateLimit from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
  ],
})
export class AppModule {}

// Use in controller
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  @Throttle(3, 60) // 3 requests per 60 seconds
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}

// SQL Injection prevention with TypeORM
@Injectable()
export class UsersService {
  // Good: Parameterized query
  async findByEmail(email: string) {
    return this.usersRepository.findOne({ 
      where: { email } // TypeORM handles escaping
    });
  }

  // Good: Query builder with parameters
  async search(term: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.name LIKE :term', { term: `%${term}%` })
      .getMany();
  }

  // Bad: Raw query without parameters
  async searchBad(term: string) {
    return this.usersRepository.query(
      `SELECT * FROM users WHERE name LIKE '%${term}%'` // SQL injection!
    );
  }
}
```

### Password Security

**Good: Proper password hashing**
```typescript
// password.service.ts
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly saltRounds = 10;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validate(password: string): boolean {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  }
}

// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.passwordService.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roles: [user.role],
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
```

### CORS Configuration

**Good: Proper CORS setup**
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(3000);
}
```

## Logging

### Structured Logging

**Good: Comprehensive logging with context**
```typescript
// logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class CustomLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log' 
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}

// Usage in service
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating user with email: ${createUserDto.email}`);

    try {
      const user = await this.usersRepository.save(createUserDto);
      this.logger.log(`User created successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to create user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
```

## Swagger/OpenAPI Documentation

**Good: Comprehensive API documentation**
```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .addTag('users')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}

// Use decorators in controller
@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
export class UsersController {
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ 
    status: 201, 
    description: 'User created successfully',
    type: User,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'User already exists' 
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }
}

// DTO with Swagger decorators
export class CreateUserDto {
  @ApiProperty({ 
    example: 'john@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: 'John Doe',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ 
    example: 'Password123!',
    minLength: 8,
    description: 'Must contain uppercase, lowercase, number and special char',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
```

## GraphQL (Optional)

**Good: GraphQL setup with NestJS**
```typescript
// app.module.ts
@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'schema.gql',
      sortSchema: true,
      playground: true,
    }),
  ],
})
export class AppModule {}

// user.resolver.ts
@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => [User], { name: 'users' })
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Query(() => User, { name: 'user' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Mutation(() => User)
  async createUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
  ): Promise<User> {
    return this.usersService.create(createUserInput);
  }

  @ResolveField(() => [Post])
  async posts(@Parent() user: User): Promise<Post[]> {
    return this.postsService.findByAuthor(user.id);
  }
}

// user.model.ts
@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;

  @Field(() => [Post], { nullable: 'items' })
  posts?: Post[];
}

// create-user.input.ts
@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @MinLength(2)
  name: string;

  @Field()
  @MinLength(8)
  password: string;
}
```

## Health Checks

**Good: Proper health check implementation**
```typescript
// health.module.ts
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}

// health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: MicroserviceHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
      () => this.disk.checkStorage('storage', { 
        thresholdPercent: 0.9,
        path: '/' 
      }),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }

  @Get('db')
  @HealthCheck()
  checkDatabase() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

## File Upload

**Good: Proper file upload handling**
```typescript
// upload.controller.ts
@Controller('upload')
export class UploadController {
  @Post('single')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new BadRequestException('Only image files are allowed'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      path: file.path,
      size: file.size,
    };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return files.map(file => ({
      filename: file.filename,
      path: file.path,
      size: file.size,
    }));
  }
}

// With validation pipe
@Post('avatar')
@UseInterceptors(FileInterceptor('avatar'))
uploadAvatar(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 1024 * 1024 }), // 1MB
        new FileTypeValidator({ fileType: 'image/*' }),
      ],
    }),
  )
  file: Express.Multer.File,
) {
  return this.usersService.updateAvatar(file);
}
```

## Background Jobs (Bull)

**Good: Job queue implementation**
```typescript
// app.module.ts
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
})
export class AppModule {}

// email.processor.ts
@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('send-welcome')
  async sendWelcomeEmail(job: Job<{ email: string; name: string }>) {
    this.logger.log(`Sending welcome email to ${job.data.email}`);

    try {
      await this.emailService.sendWelcome(job.data.email, job.data.name);
      this.logger.log(`Welcome email sent to ${job.data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}

// Usage in service
@Injectable()
export class UsersService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.usersRepository.save(createUserDto);

    // Add job to queue
    await this.emailQueue.add('send-welcome', {
      email: user.email,
      name: user.name,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return user;
  }
}
```

## Checklist

### Development
- [ ] Use proper module organization (feature-based)
- [ ] Implement DTOs for all endpoints
- [ ] Enable global validation pipe
- [ ] Use dependency injection properly
- [ ] Implement proper error handling
- [ ] Add authentication and authorization
- [ ] Use guards for route protection
- [ ] Implement logging
- [ ] Add request/response interceptors
- [ ] Use environment-based configuration
- [ ] Implement caching where appropriate

### Database
- [ ] Use proper entity relationships
- [ ] Implement soft delete
- [ ] Add database indexes
- [ ] Use query builder for complex queries
- [ ] Implement pagination
- [ ] Use transactions for multi-step operations
- [ ] Avoid N+1 queries
- [ ] Implement database migrations

### Security
- [ ] Enable helmet middleware
- [ ] Configure CORS properly
- [ ] Implement rate limiting
- [ ] Hash passwords with bcrypt
- [ ] Validate all inputs
- [ ] Sanitize user data
- [ ] Use parameterized queries
- [ ] Implement JWT authentication
- [ ] Add API key authentication (if needed)

### Testing
- [ ] Write unit tests for services
- [ ] Write E2E tests for critical flows
- [ ] Mock external dependencies
- [ ] Test error scenarios
- [ ] Achieve >80% code coverage
- [ ] Test authentication/authorization

### Documentation
- [ ] Add Swagger/OpenAPI documentation
- [ ] Document all endpoints
- [ ] Add README with setup instructions
- [ ] Document environment variables
- [ ] Add API examples

### Performance
- [ ] Enable compression
- [ ] Implement caching
- [ ] Optimize database queries
- [ ] Use connection pooling
- [ ] Implement pagination
- [ ] Add response time logging

### Production Ready
- [ ] Configure proper logging
- [ ] Add health check endpoints
- [ ] Implement graceful shutdown
- [ ] Configure PM2 or similar
- [ ] Set up monitoring
- [ ] Configure error tracking (Sentry)
- [ ] Use Docker for deployment
- [ ] Implement CI/CD pipeline

## Resources

- [Official NestJS Documentation](https://docs.nestjs.com)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)
- [TypeORM Documentation](https://typeorm.io)
- [Awesome NestJS](https://github.com/juliandavidmr/awesome-nestjs)
- [NestJS Samples](https://github.com/nestjs/nest/tree/master/sample)