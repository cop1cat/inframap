export type CallType = "sync" | "async" | "event" | "unknown";

export interface ServiceCall {
  id: string;
  type: CallType;
  broken: boolean;
}

export interface Service {
  id: string;
  label: string;
  group: string | null;
  description: string | null;
  owner: string | null;
  tags: Record<string, string>;
  links: Record<string, string>;
  calls: ServiceCall[];
}

export interface Group {
  id: string;
  label: string;
  color: string | null;
  parent: string | null;
}

export interface Meta {
  title: string;
  description: string | null;
}

export interface InfraJson {
  schema_version: number;
  meta: Meta;
  groups: Group[];
  services: Service[];
}

export const SUPPORTED_SCHEMA_VERSION = 1;

export class InfraParseError extends Error {}

export function parseInfraJson(text: string): InfraJson {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new InfraParseError(`Invalid JSON: ${(e as Error).message}`);
  }
  if (typeof data !== "object" || data === null) {
    throw new InfraParseError("Top-level JSON must be an object");
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.schema_version !== "number") {
    throw new InfraParseError("Missing schema_version");
  }
  if (obj.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    throw new InfraParseError(
      `This viewer supports schema v${SUPPORTED_SCHEMA_VERSION}, file is v${obj.schema_version}`,
    );
  }
  // Trust the rest — CLI guarantees the contract.
  return data as InfraJson;
}
