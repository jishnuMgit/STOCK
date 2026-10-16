import React, { useState } from "react";
import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { toast } from "react-toastify";

dayjs.extend(customParseFormat);

const DATE_FORMAT = "DD-MM-YYYY";

type DirectoryHandle = {
  name: string;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<DirectoryHandle>;
};

type RptDocumentExportPageProps = {
  onClose?: () => void;
};

type AppDatePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
};

/* Reusable Date Picker */
const AppDatePicker: React.FC<AppDatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  minDate,
  maxDate,
}) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      value={value ? dayjs(value, DATE_FORMAT, true) : null}
      onChange={(newValue) => {
        onChange(
          newValue?.isValid()
            ? newValue.format(DATE_FORMAT)
            : "",
        );
      }}
      format={DATE_FORMAT}
      minDate={
        minDate
          ? dayjs(minDate, DATE_FORMAT, true)
          : undefined
      }
      maxDate={
        maxDate
          ? dayjs(maxDate, DATE_FORMAT, true)
          : undefined
      }
      slotProps={{
        textField: {
          id,
          slotProps: {
            htmlInput: {
              "aria-label": label,
            },
          },
        },
        openPickerButton: {
          sx: {
            padding: "2px",
            margin: 0,
          },
        },
        inputAdornment: {
          sx: {
            margin: 0,
            padding: 0,
          },
        },
      }}
      sx={{
        width: "140px",

        "& .MuiPickersTextField-root": {
          width: "120px",
        },

        "& .MuiPickersInputBase-root": {
          width: "140px",
          height: "30px",
          minHeight: "30px",
          boxSizing: "border-box",
          borderRadius: "4px",
          backgroundColor: "#ffffff",
          fontSize: "12px",
          padding: 0,
          overflow: "hidden",
        },

        "& .MuiPickersInputBase-sectionsContainer": {
          paddingLeft: "10px !important",
          paddingRight: "0px !important",
          marginBottom: "-5px !important",
          marginLeft: "0px !important",
          boxSizing: "border-box",
          overflow: "hidden",
        },

        "& .MuiPickersInputBase-sectionContent": {
          fontSize: "12px",
          color: "#344054",
        },

        "& .MuiPickersInputBase-input": {
          minWidth: 0,
          width: "100%",
          fontSize: "12px",
          padding: 0,
          height: "30px",
          boxSizing: "border-box",
        },

        "& .MuiInputAdornment-root": {
          margin: 0,
          padding: 0,
        },

        "& .MuiIconButton-root": {
          width: "24px",
          height: "24px",
          padding: "2px",
          margin: 0,
        },

        "& .MuiSvgIcon-root": {
          fontSize: "16px",
        },

        ...(!value && {
          "&:not(:focus-within) .MuiPickersInputBase-sectionsContainer *":
            {
              color: "transparent",
            },
        }),

        "& .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: "#B7C7D7 !important",
        },

        "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },

        "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
            borderWidth: "1px",
          },

        "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },

        "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },

        "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },
      }}
    />
  </LocalizationProvider>
);

const RptDocumentExportPage: React.FC<RptDocumentExportPageProps> = ({
  onClose,
}) => {
  const [exportPath, setExportPath] = useState("");
  const [directoryHandle, setDirectoryHandle] =
    useState<DirectoryHandle | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [message, setMessage] = useState("");

  const inputClass =
    "h-[30px] w-full rounded-[4px] border border-[#cfd7df] " +
    "bg-white px-2 text-[12px] text-[#24364d] outline-none " +
    "focus:border-[#91a7b9]";

  const buttonClass =
    "btn-style inline-flex h-[34px] min-w-[90px] items-center " +
    "justify-center rounded-[4px] border border-[#cfd7df] " +
    "bg-white px-4 text-[12px] text-[#344054] shadow-sm " +
    "hover:bg-[#f3f7f5] active:bg-[#e7eee9]";

  /* Select Export Folder */
  const handleBrowseFolder = async () => {
    setMessage("");

    try {
      const pickerWindow = window as DirectoryPickerWindow;

      if (!pickerWindow.showDirectoryPicker) {
        setMessage(
          "Folder selection is not supported in this browser. Use Chrome or Edge on HTTPS or localhost.",
        );
        console.log(message)
        return;
      }

      const handle =
        await pickerWindow.showDirectoryPicker();

      setDirectoryHandle(handle);
      setExportPath(handle.name);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return;
      }

      setMessage("Unable to select the export folder.");
    }
  };

  /* From Date Change */
  const handleFromDateChange = (value: string) => {
    setFromDate(value);

    if (value && toDate) {
      const from = dayjs(value, DATE_FORMAT, true);
      const to = dayjs(toDate, DATE_FORMAT, true);

      if (
        from.isValid() &&
        to.isValid() &&
        to.isBefore(from, "day")
      ) {
        setToDate("");
      }
    }

    setMessage("");
  };

  /* To Date Change */
  const handleToDateChange = (value: string) => {
    setToDate(value);
    setMessage("");
  };

  /* Export */
  const handleExport = () => {
    if (!directoryHandle) {
      setMessage("Please select an export folder.");
      toast.warning("Please select an export folder.")
      return;
    }

    if (!fromDate || !toDate) {
      setMessage(
        "Please select both From Date and To Date.",

      );
      toast.warning("Please select both From Date and To Date.")
      return;
    }

    const from = dayjs(fromDate, DATE_FORMAT, true);
    const to = dayjs(toDate, DATE_FORMAT, true);

    if (!from.isValid() || !to.isValid()) {
      setMessage("Please select valid dates.");
      toast.warning("Please select valid dates.")
      return;
    }

    if (to.isBefore(from, "day")) {
      setMessage(
        "To Date cannot be earlier than From Date.",
      );
      toast.warning( "To Date cannot be earlier than From Date.")
      return;
    }

    console.log({
      exportFolder: directoryHandle,
      exportFolderName: exportPath,
      fromDate,
      toDate,
    });

    // Connect your document export API or file-generation
    // logic here to create the exported document.

    setMessage(
      "Export settings validated successfully.",
    );
    toast.success("Export settings validated successfully.")
  };

  /* Close / Reset */
  const handleClose = () => {
    setExportPath("");
    setDirectoryHandle(null);
    setFromDate("");
    setToDate("");
    setMessage("");
    onClose?.();
  };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-3 py-3 sm:px-4 sm:py-4">
      <div className="w-full max-w-130 bg-white">
        <main className="w-full border border-gray-400 bg-white">
          {/* Header */}
          <header className="flex h-7.5 items-center bg-[#9fdfbc]">
            <h1 className="ml-4 text-[14px] font-semibold text-[#24364d]">
              Document Export
            </h1>
          </header>

          {/* Form */}
          <section className="  pb-5 pt-5 sm:px-6">
            <div className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-x-3 gap-y-4 sm:grid-cols-[80px_minmax(0,1fr)] sm:gap-x-4">
              {/* Export Path */}
              <label
                htmlFor="exportPath"
                className="text-right text-[12px] text-[#405066]"
              >
                Export Path :
              </label>

              <div className="relative min-w-0">
                <input
                  id="exportPath"
                  type="text"
                  value={exportPath}
                  readOnly
                  onClick={handleBrowseFolder}
                  placeholder="Select export folder..."
                  title={exportPath}
                  className={`${inputClass} cursor-pointer pr-10`}
                />

                {/* Three dots inside the input */}
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  aria-label="Browse export folder"
                  title="Browse folder"
                  className="absolute right-px top-px flex h-7 w-8.5 items-center justify-center rounded-r-[3px] bg-white text-[14px] text-[#657486] hover:bg-[#f3f7f5]"
                >
                  ...
                </button>
              </div>

              {/* Period */}
              <label className="text-right text-[12px] text-[#405066]">
                Period :
              </label>

              {/* Date Pickers */}
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <AppDatePicker
                  id="fromDate"
                  label="From Date"
                  value={fromDate}
                  onChange={handleFromDateChange}
                  maxDate={toDate || undefined}
                />

                <AppDatePicker
                  id="toDate"
                  label="To Date"
                  value={toDate}
                  onChange={handleToDateChange}
                  minDate={fromDate || undefined}
                />
              </div>
            </div>

            {/* Status Message */}
            {/* {message && (
              <p
                role="status"
                className="mt-3 text-center text-[12px] text-[#405066]"
              >
                {message}
              </p>
            )} */}

            {/* Actions */}
            <div className="mt-5 flex justify-center gap-3">
              <button
                id="btnExport"
                type="button"
                onClick={handleExport}
                className={buttonClass}
              >
                <u>E</u>xport
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

export default RptDocumentExportPage;