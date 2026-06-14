## ADDED Requirements

### Requirement: Email and password login

The system SHALL authenticate an employee using their email and password and, on success, issue a signed JWT that encodes the employee's id and role.

#### Scenario: Successful login with valid credentials
- **WHEN** a user submits an email and password that match an active employee record
- **THEN** the system verifies the password against the stored bcrypt hash
- **AND** returns a JWT plus the authenticated employee's public profile (id, name, email, role)

#### Scenario: Login with wrong password
- **WHEN** a user submits an email that exists but an incorrect password
- **THEN** the system responds with HTTP 401 and a generic "invalid credentials" message
- **AND** does NOT issue a token

#### Scenario: Login with unknown email
- **WHEN** a user submits an email that matches no employee
- **THEN** the system responds with HTTP 401 and the same generic "invalid credentials" message

#### Scenario: Login by an inactive employee
- **WHEN** a user submits valid credentials for an employee whose status is `inactive`
- **THEN** the system responds with HTTP 401 and does NOT issue a token

### Requirement: Passwords stored only as hashes

The system MUST store employee passwords only as bcrypt hashes and MUST never store, log, or return plaintext passwords.

#### Scenario: Password is hashed on account creation
- **WHEN** an employee account is created or its password is changed
- **THEN** the system stores a bcrypt hash in `password_hash`
- **AND** the plaintext password never appears in API responses or logs

### Requirement: Role identity

The system SHALL assign every employee exactly one role, either `admin` or `user`, and SHALL carry that role in the issued JWT so that authorization checks can rely on it.

#### Scenario: Role is encoded in the token
- **WHEN** the system issues a JWT for an authenticated employee
- **THEN** the token payload includes the employee's `role`

### Requirement: Protected endpoints require a valid token

The system SHALL reject requests to protected API endpoints unless they carry a valid, unexpired JWT in the `Authorization: Bearer` header.

#### Scenario: Request with a valid token
- **WHEN** a request to a protected endpoint includes a valid, unexpired Bearer token
- **THEN** the system processes the request as the identified employee

#### Scenario: Request with a missing or invalid token
- **WHEN** a request to a protected endpoint has no token, a malformed token, or an expired token
- **THEN** the system responds with HTTP 401 and does not process the request

### Requirement: Retrieve the current authenticated user

The system SHALL expose a way for the client to retrieve the currently authenticated employee's profile from a valid token, so the front end can restore session state on reload.

#### Scenario: Fetch current user with a valid token
- **WHEN** the client calls `GET /api/auth/me` with a valid Bearer token
- **THEN** the system returns the authenticated employee's public profile including `role`

#### Scenario: Front end gates routes by authentication
- **WHEN** an unauthenticated visitor navigates to any page other than the login page
- **THEN** the front end redirects them to the login page
