## ADDED Requirements

### Requirement: Key metric cards

The system SHALL present a row of key-metric cards on the dashboard summarizing the fleet: total vehicles, available vehicles, vehicles in maintenance, and total employees.

#### Scenario: Cards reflect current data
- **WHEN** an authenticated employee opens the dashboard
- **THEN** the system displays cards for total vehicles, available vehicles, vehicles in maintenance, and total employees, each showing the current count

### Requirement: Fleet charts

The system SHALL present charts below the metric cards: a vehicle status distribution chart and a vehicles-by-brand chart.

#### Scenario: Status distribution chart
- **WHEN** an authenticated employee opens the dashboard
- **THEN** the system renders a chart showing the count of vehicles in each status (`available`, `in_use`, `maintenance`, `retired`)

#### Scenario: Vehicles by brand chart
- **WHEN** an authenticated employee opens the dashboard
- **THEN** the system renders a chart showing the number of vehicles per brand

### Requirement: Dashboard aggregates come from a stats endpoint

The system SHALL expose an endpoint that returns the aggregated figures needed by the cards and charts in a single response, computed server-side from current data.

#### Scenario: Fetch dashboard stats
- **WHEN** the client calls `GET /api/stats` with a valid Bearer token
- **THEN** the system returns the card counts and the chart datasets (status distribution and per-brand counts)

#### Scenario: Stats require authentication
- **WHEN** an unauthenticated request calls the stats endpoint
- **THEN** the system responds with HTTP 401
