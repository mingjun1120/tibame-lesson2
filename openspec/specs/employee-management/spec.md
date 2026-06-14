# employee-management Specification

## Purpose
TBD - created by archiving change add-vehicle-management-system. Update Purpose after archive.
## Requirements
### Requirement: Employee management is administrator-only

The system SHALL restrict all employee management operations (list, view, create, edit, delete) to administrators, and the front end SHALL hide the employee management page from general users.

#### Scenario: Administrator accesses employee management
- **WHEN** an administrator requests the employee list
- **THEN** the system returns the employees with their fields (name, email, role, department, position, phone, hire date, status)

#### Scenario: General user is blocked
- **WHEN** an employee with role `user` calls any employee management endpoint
- **THEN** the system responds with HTTP 403
- **AND** the front end does not show the employee management page in navigation for general users

### Requirement: Create an employee account

The system SHALL let an administrator create an employee, which provisions a login account with an email, an initial password (stored hashed), and an assigned role.

#### Scenario: Create employee with role
- **WHEN** an administrator submits a new employee with a unique email, an initial password, and a role of `admin` or `user`
- **THEN** the system creates the employee, stores the password as a bcrypt hash, and the new employee can subsequently log in

#### Scenario: Reject duplicate email
- **WHEN** an administrator submits an employee whose email already exists
- **THEN** the system rejects the request with a validation error and does not create a duplicate

### Requirement: Edit an employee

The system SHALL allow an administrator to edit an employee's profile fields, role, and status.

#### Scenario: Update an employee
- **WHEN** an administrator submits valid changes to an existing employee
- **THEN** the system persists the changes and returns the updated employee

### Requirement: Delete an employee

The system SHALL allow an administrator to permanently delete an employee account after explicit confirmation, but SHALL prevent an administrator from deleting their own account to avoid self-lockout.

#### Scenario: Administrator deletes another employee
- **WHEN** an administrator confirms deletion of an employee other than themselves
- **THEN** the system permanently removes the employee account and returns a success response

#### Scenario: Administrator cannot delete themselves
- **WHEN** an administrator attempts to delete their own account
- **THEN** the system responds with an error and does not delete the account

#### Scenario: Confirmation required before deletion
- **WHEN** an administrator triggers delete in the UI
- **THEN** the front end shows a confirmation dialog and only sends the delete request after the administrator confirms

