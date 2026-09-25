// Tags that exist for well-known Docker Hub images; anything else is treated as pullable
const KNOWN_TAGS: Record<string, RegExp> = {
  nginx: /^(latest|stable|mainline|alpine|1\.(1\d|2\d)(\.\d{1,2})?(-alpine)?)$/,
  busybox: /^(latest|stable|1\.3[0-7](\.\d{1,2})?)$/,
  redis: /^(latest|alpine|[67](\.\d{1,2}){0,2}(-alpine)?)$/,
  node: /^(latest|lts|alpine|(1[89]|2[0-4])(\.\d{1,2}){0,2}(-alpine|-slim)?)$/,
  httpd: /^(latest|alpine|2\.4(\.\d{1,2})?(-alpine)?)$/,
  postgres: /^(latest|alpine|1[2-7](\.\d{1,2})?(-alpine)?)$/,
};

// Splits "repo:tag" without confusing a registry port ("host:5000/app") for a tag
function parseImage(image: string): { repository: string; tag: string } {
  const withoutDigest = image.split("@")[0];
  const lastSlash = withoutDigest.lastIndexOf("/");
  const colon = withoutDigest.indexOf(":", lastSlash + 1);
  return colon === -1
    ? { repository: withoutDigest, tag: "latest" }
    : { repository: withoutDigest.slice(0, colon), tag: withoutDigest.slice(colon + 1) };
}

// Simulates the registry: a typo'd tag of a known image can't be pulled
export function isImagePullable(image: string): boolean {
  const { repository, tag } = parseImage(image);
  const name = repository.replace(/^(docker\.io\/)?(library\/)?/, "");
  const pattern = KNOWN_TAGS[name];
  return pattern === undefined || pattern.test(tag);
}
