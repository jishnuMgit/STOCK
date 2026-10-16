import React, { useState } from "react";
import { HiOutlineDotsHorizontal } from "react-icons/hi";

type DirectoryHandle = {
  name: string;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<DirectoryHandle>;
};

type SetDatabaseBackupPathPageProps = {
  onClose?: () => void;
  onModify?: (data: {
    serverBackupPath: string;
    clientBackupPath: string;
    documentExportPath: string;
  }) => void;
};

const SetDatabaseBackupPathPage: React.FC<SetDatabaseBackupPathPageProps> = ({
  onClose,
  onModify,
}) => {
  const [serverBackupPath, setServerBackupPath] = useState(
    "D:\\BOSS\\BACKUP\\JFLMERGED_BACKUP",
  );
  const [clientBackupPath, setClientBackupPath] = useState("");
  const [documentExportPath, setDocumentExportPath] = useState("");
  const [message, setMessage] = useState("");

  const inputClass =
    "h-[30px] w-full rounded-[4px] border border-[#cfd7df] " +
    "bg-white px-2 pr-[38px] text-[14px] text-[#24364d] " +
    "outline-none focus:border-[#91a7b9] disabled:cursor-not-allowed " +
    "disabled:bg-[#f3f5f7] disabled:text-[#98a2b3]";

  const buttonClass =
    "btn-style inline-flex h-[34px] min-w-[90px] items-center " +
    "justify-center rounded-[4px] border border-[#cfd7df] " +
    "bg-white px-4 text-[14px] text-[#344054] shadow-sm " +
    "hover:bg-[#f3f7f5] active:bg-[#e7eee9]";

  const handleBrowse = async (
    field: "server" | "client" | "export",
  ) => {
    setMessage("");

    try {
      const pickerWindow = window as DirectoryPickerWindow;

      if (!pickerWindow.showDirectoryPicker) {
        setMessage(
          "Folder selection is not supported in this browser. Use Chrome or Edge on HTTPS or localhost.",
        );
        return;
      }

      const handle = await pickerWindow.showDirectoryPicker();

      switch (field) {
        case "server":
          setServerBackupPath(handle.name);
          break;
        case "client":
          setClientBackupPath(handle.name);
          break;
        case "export":
          setDocumentExportPath(handle.name);
          break;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return;
      }

      setMessage("Unable to select the folder.");
    }
  };

  const handleModify = () => {
    if (
      !serverBackupPath.trim() ||
      !clientBackupPath.trim() ||
      !documentExportPath.trim()
    ) {
      setMessage("Please fill in all three paths.");
      return;
    }

    const data = {
      serverBackupPath: serverBackupPath.trim(),
      clientBackupPath: clientBackupPath.trim(),
      documentExportPath: documentExportPath.trim(),
    };

    console.log("Backup paths:", data);
    onModify?.(data);

    setMessage("Backup path settings are ready to save.");
  };

  const handleClose = () => {
    setMessage("");
    onClose?.();
  };

  const renderPathField = (
    id: string,
    label: string,
    value: string,
    setValue: (value: string) => void,
    field: "server" | "client" | "export",
    disabled = false,
  ) => (
    <>
      <label
        htmlFor={id}
        className="flex items-center justify-end text-right text-[14px] text-[#405066]"
      >
        {label}
      </label>

      <div className="relative min-w-0">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setMessage("");
          }}
          disabled={disabled}
          placeholder="Select folder path..."
          title={value}
          className={inputClass}
        />

        <button
          type="button"
          onClick={() => handleBrowse(field)}
          disabled={disabled}
          aria-label={`Browse ${label}`}
          title="Browse folder"
          className="absolute right-px top-px flex h-7 w-8.5 items-center justify-center rounded-r-[3px] bg-white text-[14px] text-[#657486] hover:bg-[#f3f7f5] disabled:cursor-not-allowed disabled:bg-[#f3f5f7]"
        >
       <HiOutlineDotsHorizontal />

        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-3 py-3 sm:px-4 sm:py-4">
      <div className="w-full max-w-178.75 min-w-178.75  bg-white">
        <main className="w-full border border-gray-400 bg-white">
          {/* Header */}
          <header className="flex h-7.5 items-center bg-[#9fdfbc]">
            <h1 className="ml-4 text-[17px]  font-semibold text-[#374151]">
              Set Database Backup Path
            </h1>
          </header>

          {/* Form */}
          <section className="px-4 pb-5 pt-5 sm:px-6">
            <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
              {renderPathField(
                "serverBackupPath",
                "Backup Path in Server :",
                serverBackupPath,
                setServerBackupPath,
                "server",
              )}

              {renderPathField(
                "clientBackupPath",
                "Backup Path in Client :",
                clientBackupPath,
                setClientBackupPath,
                "client",
                true,
              )}

              {renderPathField(
                "documentExportPath",
                "Document Export Path :",
                documentExportPath,
                setDocumentExportPath,
                "export",
              )}
            </div>

            {/* Status */}
            {/* {message && (
              <p
                role="status"
                className="mt-3 text-center text-[14px] text-[#405066]"
              >
                {message}
              </p>
            )} */}

            {/* Actions */}
            <div className="mt-5 flex justify-center gap-3">
              <button
                id="btnModify"
                type="button"
                onClick={handleModify}
                className={buttonClass}
              >
                <u>M</u>odify
              </button>

              <button
                id="btnClose"
                type="button"
                onClick={handleClose}
                className={buttonClass}
              >
                <u>C</u>lose
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default SetDatabaseBackupPathPage;