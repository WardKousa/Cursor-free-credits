# Fluxzero Base Java Project

This is a foundation project for Fluxzero applications. It serves as a base for developers and agents to build new applications.

## For AI Agents

Please refer to `AGENTS.md` for further instructions besides this readme.

## What's Included

A foundational application with the following features already configured:
- **User Mapping**: Minimal example users for authenticated sessions and RBAC
- **Authentication**: Fluxzero IDP BFF login flow, session cookie, and role-based access control (RBAC)
- **Fluxzero Integration**: Pre-configured proxy and test server

## Quick Start

Start the complete application stack:

```bash
./gradlew runTestApp
# or
./mvnw exec:java
```

This starts:
- **Fluxzero Test Server**
- **Fluxzero Proxy** on port 8080 (main entry point)
- **Fluxzero Local Stub IDP** through the same proxy origin, `http://localhost:8080`
- **Spring Boot Application**

The main application code reads a normal Fluxzero IDP tenant from the `fluxzero.auth.*` properties.
For deployed environments, provide those values through environment variables, system properties or
`src/main/resources/application.properties`. `TestApp` runs from the test classpath and imports `FluxzeroIdpStub`.
The `io.fluxzero.idp:test-support` dependency provides local stub defaults; override them in
`src/test/resources/application.properties` only when this app needs different local values.

## API Endpoints

- **GET** `/app/login` - Start browser login
- **GET** `/app/callback` - OIDC callback
- **GET** `/app/auth/session` - Current BFF session
- **GET** `/api/users` - List all users
- **POST** `/api/users` - Create new user

## Testing

Run the `All tests` run configuration in your IDE.
