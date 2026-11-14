// =========================================================
// ZatcaSdkBridge - a tiny console program around SDKNETFrameWorkLib.dll, the
// same ZATCA .NET SDK the VB code (clsZATCAFileSubmission) used. The Node
// server runs it as a child process, so signing / hashing / QR are done by the
// exact same code as before.
//
//   ZatcaSdkBridge.exe sign    JSON on stdin: { "xmlPath", "signedPath", "certificate", "privateKey" }
//   ZatcaSdkBridge.exe hash    <xml file>      (GenerateEInvoiceHashing)
//   ZatcaSdkBridge.exe qr      <xml file>      (GenerateEInvoiceQRCode)
//
// Always prints ONE line of JSON on stdout:
//   { "ok": true,  "invoiceHash": "...", "qrCode": "...", "uuid": "..." }
//   { "ok": false, "error": "..." }
// Exit code 0 when ok, 1 otherwise.
//
// Build (Windows, .NET Framework 4.x - see build.bat):
//   csc /platform:x86 /r:SDKNETFrameWorkLib.dll /r:Newtonsoft.Json.dll ZatcaSdkBridge.cs
// =========================================================
using System;
using System.IO;
using System.Text;
using System.Xml;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SDKNETFrameWorkLib.BLL;
using SDKNETFrameWorkLib.GeneralLogic;

internal static class Program
{
    private static int Main(string[] args)
    {
        try
        {
            if (args.Length < 1) return Fail("usage: ZatcaSdkBridge sign|hash|qr");

            switch (args[0])
            {
                case "sign":
                    return Sign();
                case "hash":
                    if (args.Length < 2) return Fail("hash needs an xml path");
                    return HashOnly(Path.GetFullPath(args[1]));
                case "qr":
                    if (args.Length < 2) return Fail("qr needs an xml path");
                    return QrOnly(Path.GetFullPath(args[1]));
                default:
                    return Fail("unknown command " + args[0]);
            }
        }
        catch (Exception ex)
        {
            return Fail(ex.GetType().Name + ": " + ex.Message);
        }
    }

    // ---------- sign (doSigning) ----------
    private static int Sign()
    {
        string input = new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false)).ReadToEnd();
        JObject job = JObject.Parse(input);

        string xmlPath = Path.GetFullPath((string)job["xmlPath"]);
        string signedPath = Path.GetFullPath((string)job["signedPath"]);
        string certificate = (string)job["certificate"];
        string privateKey = (string)job["privateKey"];

        if (!File.Exists(xmlPath)) return Fail("XML file not found: " + xmlPath);

        // SignDocument writes "NewSigned.xml" into the CURRENT directory (the VB deleted
        // and re-read that file). A private folder per call keeps parallel calls apart.
        string work = Path.Combine(Path.GetTempPath(), "zatca-sdk-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(work);
        string previous = Environment.CurrentDirectory;

        try
        {
            Environment.CurrentDirectory = work;

            Result signed = new EInvoiceSigningLogic().SignDocument(xmlPath, certificate, privateKey);
            if (!signed.IsValid) return Fail("Signing failed: " + Describe(signed));

            string produced = Path.Combine(work, "NewSigned.xml");
            if (File.Exists(produced))
            {
                File.Copy(produced, signedPath, true);
            }
            else if (!string.IsNullOrEmpty(signed.SingedXML))
            {
                File.WriteAllText(signedPath, signed.SingedXML, new UTF8Encoding(false));
            }
            else
            {
                return Fail("The SDK did not produce NewSigned.xml");
            }

            Result hashed = new HashingValidator().GenerateEInvoiceHashing(signedPath);
            if (!hashed.IsValid) return Fail("Hashing failed: " + Describe(hashed));

            // the invoice UUID is the 5th child of the root (what the VB read)
            string uuid = "";
            try
            {
                XmlDocument doc = new XmlDocument();
                doc.Load(signedPath);
                uuid = doc.LastChild.ChildNodes.Item(4).InnerText;
            }
            catch { }

            return Ok(new JObject
            {
                { "ok", true },
                { "invoiceHash", hashed.ResultedValue },
                { "uuid", uuid }
            });
        }
        finally
        {
            Environment.CurrentDirectory = previous;
            try { Directory.Delete(work, true); } catch { }
        }
    }

    // ---------- hash ----------
    private static int HashOnly(string xmlPath)
    {
        Result r = new HashingValidator().GenerateEInvoiceHashing(xmlPath);
        if (!r.IsValid) return Fail("Hashing failed: " + Describe(r));
        return Ok(new JObject { { "ok", true }, { "invoiceHash", r.ResultedValue } });
    }

    // ---------- qr (GenerateEInvoiceQRCode, read from the cleared / signed file) ----------
    private static int QrOnly(string xmlPath)
    {
        Result r = new QRValidator().GenerateEInvoiceQRCode(xmlPath);
        if (!r.IsValid) return Fail("QR failed: " + Describe(r));
        return Ok(new JObject { { "ok", true }, { "qrCode", r.ResultedValue } });
    }

    // ---------- helpers ----------
    private static string Describe(Result r)
    {
        StringBuilder sb = new StringBuilder();
        if (!string.IsNullOrEmpty(r.ErrorMessage)) sb.Append(r.ErrorMessage);

        if (r.lstSteps != null)
        {
            foreach (Result step in r.lstSteps)
            {
                if (step != null && !step.IsValid && !string.IsNullOrEmpty(step.ErrorMessage))
                {
                    if (sb.Length > 0) sb.Append("; ");
                    sb.Append(step.Operation).Append(": ").Append(step.ErrorMessage);
                }
            }
        }
        if (sb.Length == 0)
        {
            // no explicit message: list every step so the failing one is visible
            sb.Append("steps: ");
            if (r.lstSteps != null)
            {
                foreach (Result step in r.lstSteps)
                {
                    if (step == null) continue;
                    sb.Append("[").Append(step.Operation).Append(step.IsValid ? " ok" : " FAILED").Append("] ");
                }
            }
            sb.Append("op=").Append(r.Operation);

            // the SDK gives no text for these two, so say what they usually mean
            if (r.lstSteps != null)
            {
                foreach (Result step in r.lstSteps)
                {
                    if (step == null || step.IsValid || step.Operation == null) continue;
                    if (step.Operation.Contains("Digital Signature"))
                        sb.Append(" - the private key could not be used: it must be the EC private key as base64 text without the BEGIN/END lines");
                    else if (step.Operation.Contains("Certificate"))
                        sb.Append(" - the certificate could not be read: check the stored certificate");
                }
            }
        }
        return sb.ToString();
    }

    private static int Ok(JObject o)
    {
        Write(o);
        return 0;
    }

    private static int Fail(string message)
    {
        Write(new JObject { { "ok", false }, { "error", message } });
        return 1;
    }

    // ASCII-only JSON, so the console code page can never garble it
    private static void Write(JObject o)
    {
        StringWriter sw = new StringWriter();
        using (JsonTextWriter w = new JsonTextWriter(sw))
        {
            w.Formatting = Newtonsoft.Json.Formatting.None;
            w.StringEscapeHandling = StringEscapeHandling.EscapeNonAscii;
            o.WriteTo(w);
        }
        Console.Out.Write(sw.ToString());
        Console.Out.Flush();
    }
}
