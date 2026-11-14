ZATCA SDK BRIDGE
================
Runs the same ZATCA .NET SDK (SDKNETFrameWorkLib.dll) the old VB application used,
so signing, hashing and QR are identical. The Node server starts it for each document.

DEPLOY
  1. Copy this whole folder to the server running Node, e.g. <server folder>\zatca-bridge\
     (the server looks for .\zatca-bridge\ZatcaSdkBridge.exe relative to its working folder;
      or set ZATCA_BRIDGE_EXE to the full path of ZatcaSdkBridge.exe)
  2. The three DLLs MUST keep these exact names (dots, not underscores):
        SDKNETFrameWorkLib.dll
        BouncyCastle.Crypto.dll
        Newtonsoft.Json.dll
  3. Needs .NET Framework 4.x (already part of Windows Server). Restart the Node server.

TEST BY HAND (PowerShell / cmd)
  ZatcaSdkBridge.exe          -> prints {"ok":false,"error":"usage: ..."}  (means it starts fine)
  ZatcaSdkBridge.exe hash  some_signed_invoice.xml
  ZatcaSdkBridge.exe qr    some_cleared_invoice.xml

IF THE EXE WILL NOT START
  Run build.bat in this folder to rebuild it with the compiler that ships with Windows.

NOTES
  - Certificate and private key come from the database exactly as the VB passed them to
    SignDocument. The key must be the EC private key as base64 text WITHOUT the
    "-----BEGIN/END EC PRIVATE KEY-----" lines.
  - Linux/macOS: install mono and set ZATCA_MONO_CMD if "mono" is not on the PATH.
