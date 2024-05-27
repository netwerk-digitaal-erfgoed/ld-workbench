export const memoryConsumption = () =>
  Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
