export function accessibleRadarStatus(status: string): string {
  return status.replace(/ · renovación en \d+s$/, " · renovación automática");
}
