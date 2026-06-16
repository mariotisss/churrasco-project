# --- Build: compiles the jar inside the container (no local JDK/Maven needed) ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies: copy the pom first, then the source.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
# Tests run in CI/locally; here we only package.
RUN mvn -B -q -DskipTests package

# --- Runtime: lightweight image with only the JRE ---
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# The SQLite DB lives in /data (volume). See docker-compose.yml.
ENV CHURRASCO_DB_PATH=/data/churrasco.db
RUN mkdir -p /data

COPY --from=build /app/target/cup-*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
