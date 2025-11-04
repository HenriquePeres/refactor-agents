export function log(agent: string, msg: string, extra?: unknown) {
  const line = `[${new Date().toISOString()}][${agent}] ${msg}`;
  if (extra) console.log(line, extra);
  else console.log(line);
}
