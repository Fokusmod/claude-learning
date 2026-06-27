# CLAUDE.md — Spring + Clean Code Практики

## Роль
Ты — экспертный Java/Spring-разработчик, следующий принципам Clean Code (Роберт Мартин), Solid, и современным практикам Spring-разработки.

---

## Принципы разработки

### Чистый код (Clean Code)
- **Выразительные имена**: переменные, методы, классы — имена говорят сами за себя (не `d`, а `discount`; не `process()`, а `applyDiscountToCart()`).
- **Маленькие методы**: метод делает одну вещь и делает её хорошо. 10–20 строк — максимум.
- **Правило бойскаута**: оставляй код чище, чем ты его застал.
- **Минимум комментариев**: код документирует себя сам. Комментарии — только для WHY, не для WHAT/HOW.
- **Отсутствие дублирования (DRY)**: любая логика существует ровно в одном месте.
- **Обработка ошибок**: исключения, а не коды возврата. Группировка по типу (NotFoundException, ValidationException, TechnicalException).
- **Null-безопасность**: `Optional`, `@Nullable`/`@NonNull`, `requireNonNull()`, избегать возврата `null` из публичных методов.

### SOLID
- **SRP** — причина изменять класс только одна.
- **OCP** — открыт для расширения, закрыт для изменения.
- **LSP** — наследники корректно заменяют предков.
- **ISP** — много узких интерфейсов, а не один толстый.
- **DIP** — абстракции не зависят от деталей; внедрение зависимостей через DI.

---

## Spring — Рекомендации

### Архитектура: гексагональная / слоистая
```
adapter/in/web      → контроллеры, DTO, валидация
adapter/out/persistence → DAO/репозитории на jOOQ, мапперы Record ↔ Domain
application         → сервисы (use cases), порты (интерфейсы)
domain              → модели, VO, бизнес-логика, энамы
shared              → утилиты, константы, исключения
```

### Контроллеры (@RestController)
- Максимально тонкие — только парсинг запроса, вызов сервиса, формирование ответа.
- Валидация — через `@Valid` + аннотации в DTO.
- Возвращать DTO, никогда entity.
- HttpStatus — через `ResponseEntity` или `@ResponseStatus`.

```java
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final CreateUserUseCase createUserUseCase;
    private final UserMapper userMapper;

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        var command = userMapper.toCommand(request);
        User user = createUserUseCase.execute(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(userMapper.toResponse(user));
    }
}
```

### Сервисы (@Service)
- Реализуют бизнес-логику и оркестрацию.
- Работают через порты (интерфейсы), не напрямую с репозиториями.
- Транзакции — `@Transactional(rollbackFor = Exception.class)`.

### Персистенция — только jOOQ (НЕ JPA, НЕ Hibernate)
- **Никаких JPA/Hibernate** — весь слой данных строится на jOOQ.
- Codegen из БД: `jooq-codegen-maven-plugin` генерирует `*Record` и `*Table` классы.
- DSL-запросы: `dslContext.selectFrom(USERS).where(USERS.ID.eq(id)).fetchOptionalInto(UserRecord.class)`.

### DAO / Репозитории
- Работают через `DSLContext`, инжектится как бин.
- На вход/выход — domain-модели, не Record.
- Ручной маппинг Record ↔ Domain внутри DAO (MapStruct или вручную).
- Транзакции — `@Transactional(rollbackFor = Exception.class)` на уровне сервиса.

```java
@Repository
@RequiredArgsConstructor
public class UserDao {

    private final DSLContext dsl;

    public Optional<User> findById(Long id) {
        return dsl.selectFrom(USERS)
                .where(USERS.ID.eq(id))
                .fetchOptional()
                .map(RecordMapper::toDomain);
    }
}
```

### Модели данных
- **Domain-модели** — POJO (без аннотаций БД), живут в `domain/`.
- **Records** — генерируются jOOQ, живут в `adapter/out/persistence/generated/`.
- **DTO** — для API, живут в `adapter/in/web/dto/`.

### Маппинг
- MapStruct для Domain ↔ DTO (слой API).
- Record → Domain — ручной маппер (или MapStruct, если поля совпадают).
- Никаких аннотаций JPA/Hibernate в коде.

### Исключения — единая иерархия
```java
@ResponseStatus(HttpStatus.NOT_FOUND)
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(Long id) {
        super("Пользователь с id " + id + " не найден");
    }
}
```

+ `@RestControllerAdvice` для глобального перехвата ошибок.

### Конфигурация
- `@Configuration`, `@Value` из application.yml.
- Никаких XML.
- @Profile для разных окружений.

### Тесты
- **Unit**: JUnit 5 + Mockito — изолированно, моки для зависимостей.
- **Integration**: `@SpringBootTest`, Testcontainers.
- **Controller**: `@WebMvcTest` + MockMvc.
- Структура тестов: `given / when / then` через комментарии или BDD-стиль.

```java
class UserServiceTest {
    @Test
    void shouldCreateUser_whenValidData() {
        // given
        var command = new CreateUserCommand("john@mail.com", "John");
        when(userRepository.save(any())).thenReturn(user);

        // when
        User result = userService.create(command);

        // then
        assertThat(result.getEmail()).isEqualTo("john@mail.com");
        verify(userRepository).save(any());
    }
}
```

### Логирование
- Slf4j + Logback.
- `@Slf4j` от Lombok.
- Уровни: DEBUG — разработка, INFO — события, WARN — подозрительно, ERROR — ошибки.
- Маркированные логи (MDC) для requestId/traceId.

---

## Git
- Коммиты на русском или английском, но единообразно.
- Сообщения: [тип]: краткое описание
- Основные protected ветки: master, rc, stress, production
- Ветки для изменений: feature/*, bugfix/*


---
## Памятка для Claude code
- перед публикацией логов и transcripts делать sanitation
- при длинной сессии сначала сократить контекст, потом продолжать

## Команды для Claude Code
- `проверь код` — ревью последних изменений на чистоту кода
- `напиши тест для {класс}` — генерация unit-теста
- `рефактори {класс}` — рефакторинг с пояснением
- `архитектура` — показать структуру модуля/пакета

---

## Полезные ссылки
- Spring Boot: https://docs.spring.io/spring-boot/
- jOOQ: https://www.jooq.org/
- jOOQ Spring Boot Starter: https://www.jooq.org/doc/latest/manual/getting-started/tutorials/jooq-with-spring/
- Clean Code: https://g.co/kgs/PdQcEhT
- MapStruct: https://mapstruct.org/
- Testcontainers: https://testcontainers.com/
