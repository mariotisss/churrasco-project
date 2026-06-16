# --- Build: compila el jar dentro del contenedor (no hace falta JDK/Maven en local) ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cachea dependencias: primero el pom, luego el codigo.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
# Los tests se ejecutan en CI/local; aqui solo empaquetamos.
RUN mvn -B -q -DskipTests package

# --- Runtime: imagen ligera solo con JRE ---
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# La BD SQLite vive en /data (volumen). Ver docker-compose.yml.
ENV CHURRASCO_DB_PATH=/data/churrasco.db
RUN mkdir -p /data

COPY --from=build /app/target/cup-*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
