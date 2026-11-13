// saveFile.ts
// Saves a file WITHOUT the browser's download manager, so the browser never
// opens it afterwards (a PDF would open straight in Acrobat while the browser
// still holds the file -> "file is already open or in use").
//
// Chrome / Edge: a "Save as" window; the file is written where you choose.
// Other browsers (or when the window cannot be shown): a normal download.

type Kind = "pdf" | "xlsx";

const TYPES: Record<Kind, { description: string; accept: Record<string, string[]> }> = {
  pdf: { description: "PDF file", accept: { "application/pdf": [".pdf"] } },
  xlsx: {
    description: "Excel file",
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  },
};

const anchorDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

// Returns false when the user cancelled the "Save as" window.
export const saveFile = async (
  blob: Blob,
  fileName: string,
  kind: Kind,
): Promise<boolean> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const picker = (window as any).showSaveFilePicker;

  if (typeof picker === "function") {
    try {
      const handle = await picker.call(window, {
        suggestedName: fileName,
        types: [TYPES[kind]],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return false;
      // any other problem (blocked, not allowed here): use a normal download
    }
  }

  anchorDownload(blob, fileName);
  return true;
};
