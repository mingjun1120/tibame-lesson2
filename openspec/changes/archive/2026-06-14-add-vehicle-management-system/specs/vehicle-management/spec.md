## ADDED Requirements

### Requirement: View and list vehicles

The system SHALL allow any authenticated employee to list and view vehicles.

#### Scenario: Authenticated user lists vehicles
- **WHEN** an authenticated employee requests the vehicle list
- **THEN** the system returns the vehicles with their fields (plate number, brand, model, year, status, mileage, purchase date)

#### Scenario: Unauthenticated request is rejected
- **WHEN** an unauthenticated request asks for the vehicle list
- **THEN** the system responds with HTTP 401

### Requirement: Create a vehicle

The system SHALL allow any authenticated employee to create a vehicle, validating required fields and enforcing a unique plate number.

#### Scenario: Create with valid data
- **WHEN** an authenticated employee submits a new vehicle with a unique plate number and valid required fields
- **THEN** the system creates the vehicle and returns it with a generated id

#### Scenario: Reject duplicate plate number
- **WHEN** an authenticated employee submits a vehicle whose plate number already exists
- **THEN** the system rejects the request with a validation error and does not create a duplicate

#### Scenario: Reject invalid status value
- **WHEN** a vehicle is submitted with a `status` outside `available`, `in_use`, `maintenance`, `retired`
- **THEN** the system rejects the request with a validation error

### Requirement: Edit a vehicle

The system SHALL allow any authenticated employee to edit an existing vehicle's fields.

#### Scenario: Update an existing vehicle
- **WHEN** an authenticated employee submits valid changes to an existing vehicle
- **THEN** the system persists the changes and returns the updated vehicle

#### Scenario: Edit a non-existent vehicle
- **WHEN** an authenticated employee tries to edit a vehicle id that does not exist
- **THEN** the system responds with HTTP 404

### Requirement: Delete a vehicle is administrator-only

The system SHALL restrict deleting a vehicle to administrators, and the front end SHALL require explicit confirmation before requesting deletion.

#### Scenario: Administrator deletes a vehicle
- **WHEN** an administrator confirms deletion of a vehicle
- **THEN** the system permanently removes the vehicle and returns a success response

#### Scenario: General user is blocked from deleting
- **WHEN** an employee with role `user` attempts to delete a vehicle
- **THEN** the system responds with HTTP 403 and does not delete the vehicle
- **AND** the front end does not present a delete action to general users

#### Scenario: Confirmation required before deletion
- **WHEN** an administrator triggers delete in the UI
- **THEN** the front end shows a confirmation dialog and only sends the delete request after the administrator confirms
