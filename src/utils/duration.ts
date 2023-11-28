import prettyMilliseconds from 'pretty-ms';

export default function duration(start: Date | number): string {
  if (typeof start !== 'number') start = start.getMilliseconds()
  return prettyMilliseconds(Math.abs((new Date()).getMilliseconds() - start))
} 
  