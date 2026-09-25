export class KubectlError extends Error {}

const FLAG_ALIASES: Record<string, string> = {
  "-n": "--namespace",
  "-l": "--selector",
  "-o": "--output",
  "-A": "--all-namespaces",
};

// Flags that take the following token as their value when written without "="
const VALUE_FLAGS = new Set([
  "--namespace",
  "--selector",
  "--output",
  "--image",
  "--replicas",
  "--port",
  "--target-port",
  "--type",
  "--name",
  "--from-literal",
  "--verb",
  "--resource",
  "--role",
  "--serviceaccount",
  "--user",
  "--as",
  "--labels",
]);

export interface ParsedArgs {
  args: string[];
  flags: Map<string, string[]>;
}

// Splits on whitespace while keeping quoted strings together
export function tokenize(command: string): string[] {
  const tokens = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  return tokens.map((token) => token.replace(/"([^"]*)"|'([^']*)'/g, "$1$2"));
}

export function parseArgs(tokens: string[]): ParsedArgs {
  const args: string[] = [];
  const flags = new Map<string, string[]>();
  const add = (name: string, value: string) => flags.set(name, [...(flags.get(name) ?? []), value]);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const isFlag = token.startsWith("-") && token.length > 1;

    if (isFlag === false) {
      args.push(token);
      continue;
    }

    const [rawName, inlineValue] = token.includes("=")
      ? [token.slice(0, token.indexOf("=")), token.slice(token.indexOf("=") + 1)]
      : [token, undefined];
    const name = FLAG_ALIASES[rawName] ?? rawName;

    if (inlineValue !== undefined) add(name, inlineValue);
    else if (VALUE_FLAGS.has(name)) add(name, tokens[++i] ?? "");
    else add(name, "true");
  }

  return { args, flags };
}

export function getFlag(parsed: ParsedArgs, name: string): string | undefined {
  return parsed.flags.get(name)?.at(-1);
}

export function getFlags(parsed: ParsedArgs, name: string): string[] {
  return parsed.flags.get(name) ?? [];
}

export function hasFlag(parsed: ParsedArgs, name: string): boolean {
  return parsed.flags.has(name);
}

// "a=b,c=d" -> { a: "b", c: "d" }
export function parseLabels(text: string): Record<string, string> {
  return Object.fromEntries(
    text
      .split(",")
      .filter((pair) => pair.includes("="))
      .map((pair) => [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)])
  );
}

export function parsePositiveInt(value: string | undefined, flag: string): number {
  const number = Number(value);
  if (Number.isInteger(number) && number >= 0) return number;
  throw new KubectlError(`error: invalid argument "${value ?? ""}" for "${flag}" flag`);
}
