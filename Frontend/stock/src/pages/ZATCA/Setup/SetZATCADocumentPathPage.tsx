import React, { useCallback, useEffect, useState } from "react";
import { HiOutlineDotsHorizontal, HiOutlineFolder } from "react-icons/hi";
import { toast } from "react-toastify";

// Router mount: app.use("/api/zatca-file-path", zatcaFilePathRouter)
const API = import.meta.env.VITE_API_URL + "/zatca-file-path";

const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw new Error(`Unexpected response from ${API}${path} (${res.status}): route not reachable`);
  }
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json as T;
};

type FolderListing = {
  current: string; // "" = list of drives
  parent: string | null; // "" = back to drives, null = none
  folders: { name: string; path: string }[];
};

type SetZATCADocumentPathProps = {
  onClose?: () => void;
};

const DEFAULT_PATH = "C:\\";

const SetZATCADocumentPath: React.FC<SetZATCADocumentPathProps> = ({
  onClose,
}) => {
  const [serverBackupPath, setServerBackupPath] = useState(DEFAULT_PATH);
  const [exists, setExists] = useState(false); // false => Save, true => Modify
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [listing, setListing] = useState<FolderListing | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);

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

  // page load + Cancel: the saved path of the company
  const loadData = useCallback(async () => {
    try {
      const { data } = await api<{ data: { filePath: string; exists: boolean } }>(
        "/getZATCAFilePath"
      );
      setServerBackupPath(data.exists ? data.filePath : DEFAULT_PATH);
      setExists(data.exists);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      try {
        const { data } = await api<{
          data: { filePath: string; exists: boolean };
        }>("/getZATCAFilePath");
        if (active) {
          setServerBackupPath(data.exists ? data.filePath : DEFAULT_PATH);
          setExists(data.exists);
        }
      } catch (e) {
        if (active) toast.error((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadInitialData();
    return () => {
      active = false;
    };
  }, []);

  const handleCancel = () => {
    setLoading(true);
    void loadData();
  };

  // lists the sub-folders of a folder ON THE SERVER (the old FolderBrowserDialog)
  const openFolder = async (folder: string) => {
    setPickerLoading(true);
    try {
      const { data } = await api<{ data: FolderListing }>(
        `/browseFolders?path=${encodeURIComponent(folder)}`
      );
      setListing(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPickerLoading(false);
    }
  };

  const handleBrowse = async () => {
    setPickerOpen(true);
    // start from the path already in the box, else from the drives
    await openFolder(serverBackupPath.trim());
  };

  const handleSelectFolder = () => {
    if (!listing?.current) return;
    setServerBackupPath(listing.current);
    setPickerOpen(false);
  };

  const handleModify = async () => {
    if (!serverBackupPath.trim()) {
      toast.error("Please Select 'File Path'");
      return;
    }

    setLoading(true);
    try {
      const { message } = await api<{ message: string }>("/saveZATCAFilePath", {
        method: "POST",
        body: JSON.stringify({ filePath: serverBackupPath.trim() }),
      });
      setExists(true);
      toast.success(message);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    window.history.back();
  };

  const renderPathField = (
    id: string,
    label: string,
    value: string,
    setValue: (value: string) => void,
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
          maxLength={50}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
          placeholder="Select folder path..."
          title={value}
          className={inputClass}
        />

        <button
          type="button"
          onClick={handleBrowse}
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
      <div className=" max-w-160  bg-white">
        <main className="w-full border border-gray-400 bg-white">
          {/* Header */}
          <header className="flex h-7.5 items-center bg-[#9fdfbc]">
            <h1 className="ml-4 text-[17px]  font-semibold text-[#374151]">
              Set ZATCA Document Path
            </h1>
          </header>

          {/* Form */}
          <section className="px-4 pb-5 pt-5 sm:px-6">
            <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
              {renderPathField(
                "serverBackupPath",
                "ZATCA Document Path :",
                serverBackupPath,
                setServerBackupPath,
                loading,
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex justify-center gap-3">
              <button
                id="btnModify"
                type="button"
                onClick={handleModify}
                disabled={loading}
                className={buttonClass}
              >
                {exists ? (
                  <>
                    <u>M</u>odify
                  </>
                ) : (
                  <>
                    <u>S</u>ave
                  </>
                )}
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

      {/* Folder picker (server folders) */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-3">
          <div className="w-full max-w-120 border border-gray-400 bg-white">
            <header className="flex h-7.5 items-center bg-[#9fdfbc]">
              <h2 className="ml-4 text-[17px] font-semibold text-[#374151]">
                Select Folder
              </h2>
            </header>

            <div className="px-4 pb-4 pt-3">
              <div
                className="mb-2 truncate rounded-[4px] border border-[#cfd7df] bg-[#f3f5f7] px-2 py-1 text-[14px] text-[#24364d]"
                title={listing?.current}
              >
                {listing?.current || "Drives"}
              </div>

              <ul className="h-64 overflow-y-auto rounded-[4px] border border-[#cfd7df] text-[14px] text-[#24364d]">
                {listing && listing.parent !== null && (
                  <li>
                    <button
                      type="button"
                      onClick={() => openFolder(listing.parent as string)}
                      className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-[#f3f7f5]"
                    >
                      <HiOutlineFolder /> ..
                    </button>
                  </li>
                )}
                {listing?.folders.map((f) => (
                  <li key={f.path}>
                    <button
                      type="button"
                      onClick={() => openFolder(f.path)}
                      className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-[#f3f7f5]"
                    >
                      <HiOutlineFolder /> {f.name}
                    </button>
                  </li>
                ))}
                {listing && !pickerLoading && listing.folders.length === 0 && (
                  <li className="px-2 py-1 text-[#98a2b3]">No sub-folders</li>
                )}
              </ul>

              <div className="mt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  disabled={!listing?.current || pickerLoading}
                  className={buttonClass}
                >
                  <u>S</u>elect
                </button>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className={buttonClass}
                >
                  <u>C</u>ancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetZATCADocumentPath;
