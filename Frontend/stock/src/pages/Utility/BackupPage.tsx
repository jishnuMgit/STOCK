import React, { useRef, useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done" }
  | { kind: "error"; message: string };

type BackupPageProps = {
  databaseName?: string;
  /** Run the backup on your server. Throw an Error to show its message. */
  onBackup?: (path: string) => Promise<void> | void;
  /** Open your own folder / file picker and return the chosen path. */
  onBrowse?: () => Promise<string | undefined> | string | undefined;
  onClose?: () => void;
};

const BackupPage: React.FC<BackupPageProps> = ({
  databaseName = "GREENSPECTRA",
  onBackup,
  onBrowse,
  onClose,
}) => {
  const [path, setPath] = useState(""); // txtBackupPath
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  const running = status.kind === "running";

  const handleBrowse = async () => {
    if (onBrowse) {
      const chosen = await onBrowse();
      if (chosen) {
        setPath(chosen);
        setStatus({ kind: "idle" });
      }
    }
    inputRef.current?.focus();
  };

  const handleBackup = async () => {
    const trimmed = path.trim();
    if (!trimmed) {
      setStatus({
        kind: "error",
        message: "Enter the backup path and file name.",
      });
      inputRef.current?.focus();
      return;
    }

    setStatus({ kind: "running" });
    try {
      if (onBackup) await onBackup(trimmed);
      else console.log({ database: databaseName, path: trimmed });
      setStatus({ kind: "done" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Backup failed.",
      });
    }
  };

  const handleClose = () => {
    setPath("");
    setStatus({ kind: "idle" });
    onClose?.();
  };

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-125 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Backup
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-4">
            <p className="m-0 text-center text-[13px] font-medium text-[#c0392b]">
              Backup Database &lsquo;{databaseName}&rsquo;
            </p>

            <label
              htmlFor="txtBackupPath"
              className="mt-5 block text-[12px] text-[#405066]"
            >
              Database Backup Path &amp; Name :
            </label>

            {/* The browse button sits inside the input, at its right edge */}
            <div className="relative mt-2">
              <input
                ref={inputRef}
                id="txtBackupPath"
                type="text"
                autoFocus
                disabled={running}
                value={path}
                onChange={(event) => {
                  setPath(event.target.value);
                  setStatus({ kind: "idle" });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleBackup();
                }}
                className="h-[30px] w-full rounded-[4px] border border-[#cfd7df] bg-white py-0 pl-2 pr-9 text-[12px] text-[#24364d] outline-none focus:border-[#91a7b9] disabled:bg-[#f6f8fa]"
              />
              <button
                id="btnBrowse"
                type="button"
                aria-label="Browse"
                title="Browse"
                disabled={running}
                onClick={handleBrowse}
                className="absolute right-1 top-1/2 flex h-[22px] w-[28px] -translate-y-1/2 items-center justify-center rounded-[3px] pb-1 text-[17px] leading-none text-[#405066] hover:bg-[#eef3f7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                &hellip;
              </button>
            </div>

            <div aria-live="polite" className="mt-2 min-h-[18px] text-[12px]">
              {status.kind === "running" && (
                <span className="text-[#405066]">Backing up&hellip;</span>
              )}
              {status.kind === "done" && (
                <span className="text-[#2e8b57]">Backup completed.</span>
              )}
              {status.kind === "error" && (
                <span role="alert" className="text-[#c0392b]">
                  {status.message}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex justify-center gap-3">
              <button
                id="btnBackup"
                type="button"
                onClick={handleBackup}
                disabled={running}
                className="btn-style disabled:cursor-not-allowed disabled:opacity-60"
              >
                <u>B</u>ackup
              </button>
              <button
                id="btnClose"
                type="button"
                onClick={handleClose}
                disabled={running}
                className="btn-style disabled:cursor-not-allowed disabled:opacity-60"
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

export default BackupPage;