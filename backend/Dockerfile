# syntax=docker/dockerfile:1.7
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /workspace

COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
    mvn -q -DskipTests dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -q -DskipTests package

FROM eclipse-temurin:17-jre

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /usr/sbin/nologin campus
COPY --from=build /workspace/target/campus-service-*.jar /app/campus-service.jar
RUN chown -R campus:campus /app

USER campus
EXPOSE 3000

ENTRYPOINT ["java", "-jar", "/app/campus-service.jar"]
