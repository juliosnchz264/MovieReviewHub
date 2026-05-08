# syntax=docker/dockerfile:1.7
# ---------- Build stage ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Capa pom.xml — invalida cache de deps solo si cambia pom
COPY pom.xml .

# Resolver deps con cache mount (no se hornea en la capa, persiste entre builds en Render)
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q dependency:go-offline

# Capa src — invalida solo cuando cambia el codigo
COPY src ./src

# Build con el mismo cache mount
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -DskipTests clean package && \
    cp target/*.jar /app/app.jar

# ---------- Runtime stage ----------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=build /app/app.jar app.jar

EXPOSE 8080

# Optimizaciones para free tier (512MB, CPU compartido):
#   UseContainerSupport + MaxRAMPercentage  -> respeta el limite de memoria del container
#   TieredStopAtLevel=1                     -> JIT solo C1, startup mas rapido (sacrifica peak throughput)
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75 -XX:TieredStopAtLevel=1"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
