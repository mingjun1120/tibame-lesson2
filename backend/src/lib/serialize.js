// Strip the password hash before returning an employee to clients.
export function toPublicEmployee(employee) {
  if (!employee) return employee;
  const { passwordHash, ...rest } = employee;
  return rest;
}
