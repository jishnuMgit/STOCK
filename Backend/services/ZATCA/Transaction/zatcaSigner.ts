/* =========================================================
   ZATCA SIGNER - replaces _IEInvoiceSigningLogic.SignDocument from the .NET SDK
   (SDKNETFrameWorkLib). It takes the unsigned UBL file and writes the signed
   one (XAdES signature + embedded QR).

   The default implementation runs the official ZATCA SDK command line tool
   ("fatoora", Java 11-14) that ships in the same SDK the .NET wrapper was built
   on. Swap it for a sidecar service by passing your own ZatcaSigner to
   setZatcaSigner().

   Environment:
     ZATCA_SDK_HOME         folder of the unzipped ZATCA SDK (contains Apps/, Configuration/, Data/)
     ZATCA_FATOORA_CMD      optional, full path of the fatoora launcher
                            (default <ZATCA_SDK_HOME>/Apps/fatoora or fatoora.bat on Windows)
     ZATCA_SIGN_TIMEOUT_MS  optional, default 60000
========================================================= */

import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type SignInput = {
  unsignedPath: string;
  signedPath: string; // where the signed XML must be written
  certificate: string; // dbo.getzatcacertificate
  privateKey: string; // dbo.getzatcaprivatekey
};

export interface ZatcaSigner {
  sign(input: SignInput): Promise<void>;
}

// PEM headers / line breaks are not part of what the SDK reads when usePemFile=false
const rawKeyMaterial = (s: string): string =>
  s
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");

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

let signer: ZatcaSigner = new FatooraCliSigner();

export const getZatcaSigner = (): ZatcaSigner => signer;
export const setZatcaSigner = (s: ZatcaSigner): void => {
  signer = s;
};
