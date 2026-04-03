import { ImapFlow } from "imapflow";

export interface ImapCredentials {
  provider: "IMAP";
  host: string;
  port: number;
  tls: boolean;
  password: string;
}

export interface FetchedEmail {
  uid: number;
  from: string;
  subject: string;
  date: Date;
  bodyText: string;
}

export async function fetchEmailsBySubject(
  email: string,
  credentials: ImapCredentials,
  subjectFilter: string,
  since: Date
): Promise<FetchedEmail[]> {
  const client = new ImapFlow({
    host: credentials.host,
    port: credentials.port,
    secure: credentials.tls,
    auth: {
      user: email,
      pass: credentials.password,
    },
    logger: false,
  });

  const results: FetchedEmail[] = [];

  try {
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");
    try {
      const searchCriteria = {
        since,
        subject: subjectFilter,
      };

      const searchResult = await client.search(searchCriteria, { uid: true });

      if (!searchResult || searchResult.length === 0) {
        return results;
      }

      const uids = searchResult as number[];

      // Limit to 50 emails per sync to avoid long-running connections
      const uidSlice = uids.slice(-50);
      const uidRange = uidSlice.join(",");

      for await (const message of client.fetch(uidRange, {
        uid: true,
        envelope: true,
        source: true,
      }, { uid: true })) {
        const from = message.envelope?.from?.[0]?.address ?? "unknown";
        const subject = message.envelope?.subject ?? "";
        const date = message.envelope?.date ?? new Date();

        // Extract plain text from raw source
        let bodyText = "";
        if (message.source) {
          bodyText = extractTextFromSource(message.source);
        }

        results.push({
          uid: message.uid,
          from,
          subject,
          date,
          bodyText,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return results;
}

export async function testConnection(
  email: string,
  credentials: ImapCredentials
): Promise<{ success: boolean; error?: string }> {
  const client = new ImapFlow({
    host: credentials.host,
    port: credentials.port,
    secure: credentials.tls,
    auth: {
      user: email,
      pass: credentials.password,
    },
    logger: false,
  });

  try {
    await client.connect();
    await client.logout();
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return { success: false, error: message };
  }
}

function extractTextFromSource(source: Buffer): string {
  const raw = source.toString("utf-8");

  // Try to find a text/plain part in the MIME message
  // Simple approach: look for content after the headers (double newline)
  const headerEnd = raw.indexOf("\r\n\r\n");
  if (headerEnd === -1) return raw;

  const body = raw.slice(headerEnd + 4);

  // If it's a multipart message, try to extract the text/plain part
  const contentTypeMatch = raw.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary="?([^\r\n"]+)"?/i);
  if (contentTypeMatch) {
    const boundary = contentTypeMatch[1];
    return extractPlainTextFromMultipart(body, boundary);
  }

  // Check for base64 or quoted-printable encoding
  const transferEncoding = raw.match(/Content-Transfer-Encoding:\s*(\S+)/i);
  if (transferEncoding) {
    return decodeContent(body, transferEncoding[1]);
  }

  return body.trim();
}

function extractPlainTextFromMultipart(body: string, boundary: string): string {
  const parts = body.split(`--${boundary}`);

  for (const part of parts) {
    if (part.match(/Content-Type:\s*text\/plain/i)) {
      const partHeaderEnd = part.indexOf("\r\n\r\n");
      if (partHeaderEnd === -1) continue;

      const partBody = part.slice(partHeaderEnd + 4);
      const transferEncoding = part.match(/Content-Transfer-Encoding:\s*(\S+)/i);

      if (transferEncoding) {
        return decodeContent(partBody, transferEncoding[1]);
      }
      return partBody.trim();
    }
  }

  // Fallback: return everything if no text/plain found
  return body.substring(0, 2000).trim();
}

function decodeContent(content: string, encoding: string): string {
  const enc = encoding.toLowerCase();

  if (enc === "base64") {
    return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf-8").trim();
  }

  if (enc === "quoted-printable") {
    return content
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .trim();
  }

  return content.trim();
}
