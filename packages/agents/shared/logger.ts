/*
export function log(agent: string, msg: string, extra?: unknown) {
  const line = `[${new Date().toISOString()}][${agent}] ${msg}`;
  if (extra) console.log(line, extra);
  else console.log(line);
}
*/

export function log(agent: string, msg: string, extra?: unknown) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}][${agent}] ${msg}`;

  if (extra === undefined) {
    console.log(prefix);
    return;
  }

  // Se for string, loga direto
  if (typeof extra === "string") {
    console.log(prefix, extra);
    return;
  }

  // Qualquer outro tipo → pretty JSON
  try {
    const json = JSON.stringify(extra, null, 2);
    console.log(prefix + "\n" + json);
  } catch {
    console.log(prefix, extra);
  }
}

