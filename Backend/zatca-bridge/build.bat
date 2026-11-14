@echo off
rem Rebuilds ZatcaSdkBridge.exe with the C# compiler that ships with Windows (.NET Framework 4.x).
rem Only needed if the prebuilt exe does not start on your server.
set CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe
"%CSC%" /nologo /platform:x86 /target:exe /out:ZatcaSdkBridge.exe /r:SDKNETFrameWorkLib.dll /r:Newtonsoft.Json.dll /r:System.Xml.dll ZatcaSdkBridge.cs
if errorlevel 1 (echo BUILD FAILED) else (echo OK - ZatcaSdkBridge.exe built)
