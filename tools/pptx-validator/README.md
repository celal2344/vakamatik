# Independent PPTX validator

The validator uses only the .NET base class library. It targets .NET 10 and opens the PPTX as an OPC ZIP package. The installed .NET 10 SDK could restore the .NET 8 targeting pack, but this machine has only the .NET 10 runtime; a `net8.0` build therefore could not execute (`Microsoft.NETCore.App 8.0.0` missing). Targeting the smallest locally runnable framework keeps Gate 1 reproducible without installing a machine-wide runtime. It verifies required package parts, content types, internal relationship targets, exact slide dimensions, semantic order, native DrawingML text/tables, notes, image transform representation, object bounds, and configured privacy canaries.

```powershell
dotnet run --project tools/pptx-validator/PptxValidator.csproj -- `
  artifacts/gate-1/gate-1-spike.pptx `
  artifacts/gate-1/validation/structure-report.json
```

This deliberately small validator is not a replacement for Microsoft PowerPoint open/edit/save/reopen acceptance or a complete ECMA-376 schema validator.
