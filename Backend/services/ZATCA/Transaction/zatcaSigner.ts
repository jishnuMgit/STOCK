/* =========================================================
   ZATCA SIGNER - replaces _IEInvoiceSigningLogic.SignDocument,
   _IHashingValidator.GenerateEInvoiceHashing and _IQRValidator.GenerateEInvoiceQRCode
   from the .NET SDK (SDKNETFrameWorkLib.dll) used by the VB code.

   DEFAULT: DotNetSdkSigner - runs ZatcaSdkBridge.exe (zatca-bridge/), a tiny console
   program that calls the very same SDKNETFrameWorkLib.dll the VB used. Same signing,
   same hash, same QR, so the output is identical to the old application.

   OPTIONAL: FatooraCliSigner - the official Java SDK command line tool
   (set ZATCA_SIGNER=fatoora). Swap in your own with setZatcaSigner().

   Environment (DotNetSdkSigner):
     ZATCA_BRIDGE_EXE       path of ZatcaSdkBridge.exe
                            (default <cwd>/zatca-bridge/ZatcaSdkBridge.exe)
     ZATCA_MONO_CMD         only on Linux / macOS: the mono launcher (default "mono")
     ZATCA_SIGN_TIMEOUT_MS  optional, default 60000

   Environment (FatooraCliSigner):
     ZATCA_SDK_HOME         folder of the unzipped ZATCA SDK (contains Apps/, Configuration/, Data/)
     ZATCA_FATOORA_CMD      optional, full path of the fatoora launcher
========================================================= */

import { execFile, spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type SignInput = {
  unsignedPath: string;
  signedPath: string; // where the signed XML must be written
  certificate: string; // dbo.getzatcacertificate
  privateKey: string; // dbo.getzatcaprivatekey
};

export type SignResult = {
  invoiceHash?: string; // what the SDK's hashing returns for the signed file
  uuid?: string; // invoice UUID as read from the signed file
};

export interface ZatcaSigner {
  sign(input: SignInput): Promise<SignResult | void>;
  /** QR code of an XML file as the SDK builds it (GenerateEInvoiceQRCode) - optional */
  qrCode?(xmlPath: string): Promise<string>;
}

// PEM headers / line breaks are not part of what the SDK reads when usePemFile=false
const rawKeyMaterial = (s: string): string =>
  s
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");

// ---- certificate handling for the .NET SDK bridge ----
// headers first: removing whitespace first would turn "BEGIN CERTIFICATE" into "BEGINCERTIFICATE"
const stripCertificate = (s: string): string =>
  s.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/["'\s]/g, "");

// The forms the SDK may expect the certificate in, tried in this order:
//   1. exactly as stored (what the VB sent)
//   2. cleaned: no headers / quotes / whitespace
//   3. decoded once (stored value is the double-encoded binarySecurityToken "TUlJ...")
//   4. encoded once (stored value is the plain certificate "MII...")
//   5. full PEM: BEGIN/END lines around the 64-column body (some builds only read that form)
// pemFirst: mono (Linux / macOS) only reads the full PEM form, so it goes first there and
// the other forms are not tried (and no extra process is started) on every document.
const certificateCandidates = (stored: string, pemFirst = false): string[] => {
  const list: string[] = [stored];
  const add = (v: string): void => {
    if (v && !list.includes(v)) list.push(v);
  };
  const clean = stripCertificate(stored);
  add(clean);
  if (clean.startsWith("TUlJ")) {
    add(stripCertificate(Buffer.from(clean, "base64").toString("utf8")));
  } else if (clean.startsWith("MII")) {
    add(Buffer.from(clean, "utf8").toString("base64"));
  }

  // the plain certificate body (MII...), whichever way it was stored
  const body = clean.startsWith("TUlJ")
    ? stripCertificate(Buffer.from(clean, "base64").toString("utf8"))
    : clean;
  if (body.startsWith("MII")) {
    add(`-----BEGIN CERTIFICATE-----\n${(body.match(/.{1,64}/g) ?? []).join("\n")}\n-----END CERTIFICATE-----`);
  }

  if (pemFirst) {
    const i = list.findIndex((c) => c.startsWith("-----BEGIN"));
    if (i > 0) list.unshift(...list.splice(i, 1));
  }
  return list;
};

// The SDK copies the certificate text into <ds:X509Certificate> exactly as it was given. Given
// the PEM form (which mono needs), the BEGIN/END lines end up inside a base64Binary element and
// ZATCA answers XSD_ZATCA_INVALID. That element sits in KeyInfo, outside both signed digests
// (the invoice and xades:SignedProperties), so replacing its text with the plain base64 body
// leaves the signature, the invoice hash and the QR valid.
const cleanEmbeddedCertificate = async (signedPath: string): Promise<void> => {
  const xml = await readFile(signedPath, "utf8");
  const fixed = xml.replace(
    /(<(?:\w+:)?X509Certificate\b[^>]*>)([\s\S]*?)(<\/(?:\w+:)?X509Certificate>)/g,
    (_m: string, open: string, body: string, close: string) => `${open}${stripCertificate(body)}${close}`
  );
  if (fixed !== xml) await writeFile(signedPath, fixed, "utf8");
};

// safe diagnostics: never logs the value itself
const describeSecret = (label: string, s: string): void => {
  console.log(
    `[zatca] ${label}: len=${s.length} start=${s.slice(0, 6)} ` +
      `header=${/-----BEGIN/.test(s)} ws=${/\s/.test(s)} quotes=${/["']/.test(s)}`
  );
};

const exists = async (p: string): Promise<boolean> => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

const run = (
  cmd: string,
  args: string[],
  opts: { env: NodeJS.ProcessEnv; cwd: string; timeout: number }
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { ...opts, windowsHide: true, shell: process.platform === "win32", maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`ZATCA SDK failed: ${(stderr || stdout || error.message).toString().trim()}`));
        } else {
          resolve({ stdout: String(stdout), stderr: String(stderr) });
        }
      }
    );
  });

export class FatooraCliSigner implements ZatcaSigner {
  async sign({ unsignedPath, signedPath, certificate, privateKey }: SignInput): Promise<void> {
    const home = process.env.ZATCA_SDK_HOME?.trim();
    if (!home) {
      throw new Error("ZATCA signing is not configured: set ZATCA_SDK_HOME to the ZATCA SDK folder");
    }
    if (!certificate.trim() || !privateKey.trim()) {
      throw new Error("ZATCA certificate / private key is not configured for this company");
    }

    const cmd =
      process.env.ZATCA_FATOORA_CMD?.trim() ||
      path.join(home, "Apps", process.platform === "win32" ? "fatoora.bat" : "fatoora");
    const timeout = Number(process.env.ZATCA_SIGN_TIMEOUT_MS) || 60_000;

    // a private working folder per call: the SDK reads the cert / key from files named in its config
    const work = await mkdtemp(path.join(os.tmpdir(), "zatca-sign-"));

    try {
      const certPath = path.join(work, "cert.pem");
      const keyPath = path.join(work, "key.pem");
      const pihPath = path.join(work, "pih.txt");
      const configPath = path.join(work, "config.json");

      await writeFile(certPath, rawKeyMaterial(certificate), "utf8");
      await writeFile(keyPath, rawKeyMaterial(privateKey), "utf8");
      await writeFile(pihPath, "", "utf8");

      // keep the SDK's own schema / schematron paths, override only what is per-company
      let config: Record<string, unknown> = {};
      const baseConfig = path.join(home, "Configuration", "config.json");
      if (await exists(baseConfig)) {
        config = JSON.parse(await readFile(baseConfig, "utf8")) as Record<string, unknown>;
      }
      config = {
        ...config,
        certPath,
        privateKeyPath: keyPath,
        pihPath,
        inputPath: path.dirname(unsignedPath),
        usePemFile: "false",
      };
      await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");

      await rm(signedPath, { force: true });

      const { stdout } = await run(
        cmd,
        ["-sign", "-invoice", unsignedPath, "-signedInvoice", signedPath],
        {
          env: {
            ...process.env,
            FATOORA_HOME: path.join(home, "Apps"),
            SDK_CONFIG: configPath,
          },
          cwd: home,
          timeout,
        }
      );

      if (!(await exists(signedPath))) {
        throw new Error(`ZATCA SDK did not produce a signed file. ${stdout.trim()}`.trim());
      }
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
}

/* =========================================================
   .NET SDK (SDKNETFrameWorkLib.dll) through ZatcaSdkBridge.exe
========================================================= */

type BridgeReply = {
  ok: boolean;
  error?: string;
  invoiceHash?: string;
  qrCode?: string;
  uuid?: string;
};

const bridgeExe = (): string =>
  process.env.ZATCA_BRIDGE_EXE?.trim() ||
  path.resolve(process.cwd(), "zatca-bridge", "ZatcaSdkBridge.exe");

function runBridge(args: string[], stdin?: string): Promise<BridgeReply> {
  const exe = bridgeExe();
  const timeout = Number(process.env.ZATCA_SIGN_TIMEOUT_MS) || 60_000;

  // the exe is a .NET Framework program: native on Windows, through mono elsewhere
  const windows = process.platform === "win32";
  const cmd = windows ? exe : process.env.ZATCA_MONO_CMD?.trim() || "mono";
  const cmdArgs = windows ? args : [exe, ...args];

  return exists(exe).then(
    (found) =>
      new Promise<BridgeReply>((resolve, reject) => {
        if (!found) {
          reject(
            new Error(
              `ZATCA SDK bridge not found at ${exe}. Copy the zatca-bridge folder next to the server or set ZATCA_BRIDGE_EXE`
            )
          );
          return;
        }

        // the SDK loads BouncyCastle.Crypto.dll etc. from its own folder
        const child = spawn(cmd, cmdArgs, { cwd: path.dirname(exe), windowsHide: true });
        let out = "";
        let err = "";
        let settled = false;

        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          fn();
        };

        const timer = setTimeout(() => {
          child.kill();
          finish(() => reject(new Error(`ZATCA SDK bridge timed out after ${timeout} ms`)));
        }, timeout);

        child.stdout.on("data", (d: Buffer) => (out += d.toString("utf8")));
        child.stderr.on("data", (d: Buffer) => (err += d.toString("utf8")));
        child.on("error", (e: Error) =>
          finish(() => reject(new Error(`Could not start the ZATCA SDK bridge (${cmd}): ${e.message}`)))
        );
        child.on("close", () =>
          finish(() => {
            const line = out.trim().split(/\r?\n/).filter(Boolean).pop() ?? "";
            try {
              resolve(JSON.parse(line) as BridgeReply);
            } catch {
              // not our JSON: .NET crashed before the program could answer (missing DLL, wrong runtime ...)
              const detail = (err || out).trim().slice(0, 600);
              reject(new Error(`ZATCA SDK bridge failed: ${detail || "no output"}`));
            }
          })
        );

        child.stdin.on("error", () => undefined);
        child.stdin.end(stdin ?? "");
      })
  );
}

export class DotNetSdkSigner implements ZatcaSigner {
  async sign({ unsignedPath, signedPath, certificate, privateKey }: SignInput): Promise<SignResult> {
    if (!certificate.trim() || !privateKey.trim()) {
      throw new Error("ZATCA certificate / private key is not configured for this company");
    }

    // the bridge README: the key is the EC private key as base64 text WITHOUT the BEGIN/END lines
    const key = rawKeyMaterial(privateKey);

    describeSecret("certificate (stored)", certificate);
    describeSecret("privateKey (stored)", privateKey);

    let lastError = "ZATCA signing failed";
    const candidates = certificateCandidates(certificate, process.platform !== "win32");

    for (let i = 0; i < candidates.length; i += 1) {
      const reply = await runBridge(
        ["sign"],
        JSON.stringify({
          xmlPath: path.resolve(unsignedPath),
          signedPath: path.resolve(signedPath),
          certificate: candidates[i],
          privateKey: key,
        })
      );

      if (reply.ok) {
        await cleanEmbeddedCertificate(signedPath);
        console.log(`[zatca] signed with certificate form #${i + 1} of ${candidates.length}`);
        return { invoiceHash: reply.invoiceHash, uuid: reply.uuid };
      }

      lastError = reply.error || lastError;
      // only a certificate-decoding failure is worth retrying with another certificate form
      if (!/decode certificate/i.test(lastError)) break;
      console.log(`[zatca] certificate form #${i + 1} rejected: ${lastError}`);
    }

    throw new Error(lastError);
  }

  async qrCode(xmlPath: string): Promise<string> {
    const reply = await runBridge(["qr", path.resolve(xmlPath)]);
    if (!reply.ok) throw new Error(reply.error || "ZATCA QR generation failed");
    return reply.qrCode ?? "";
  }
}

let signer: ZatcaSigner =
  (process.env.ZATCA_SIGNER ?? "dotnet").trim().toLowerCase() === "fatoora"
    ? new FatooraCliSigner()
    : new DotNetSdkSigner();

export const getZatcaSigner = (): ZatcaSigner => signer;
export const setZatcaSigner = (s: ZatcaSigner): void => {
  signer = s;
};