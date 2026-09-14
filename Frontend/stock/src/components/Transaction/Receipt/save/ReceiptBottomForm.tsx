
import React from "react";

interface Props {
  /* =========================================================
     DESCRIPTION
     Description belongs to the currently active row.

     IMPORTANT:
     This component does NOT clear the description when Enter
     is pressed. The parent controls the active row and stores
     each row's description separately.
  ========================================================= */

  description: string;

  setDescription: (value: string) => void;

  descriptionRef: React.RefObject<
    HTMLInputElement | null
  >;

  onDescriptionEnter: (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => void;

  /* =========================================================
     NOTE
     Note is common for the whole receipt.
  ========================================================= */

  note: string;

  setNote: (value: string) => void;

  noteRef: React.RefObject<
    HTMLTextAreaElement | null
  >;

  onNoteEnter: (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => void;
}

const ReceiptBottomForm: React.FC<Props> = ({
  description,
  setDescription,
  descriptionRef,
  onDescriptionEnter,

  note,
  setNote,
  noteRef,
  onNoteEnter,
}) => {
  return (
    <div className="-mt-4 ml-10 w-[76%]">

      {/* =====================================================
          DESCRIPTION
          Description belongs to the currently active row.

          When Enter is pressed:
          - The description is NOT cleared.
          - Parent handles cursor/row navigation.
          - When returning to this row, its description
            remains available for editing.
      ===================================================== */}

      <div className="mb-2 flex w-[60%] items-center gap-2">

        <label className="w-20.5 shrink-0 text-right text-xs">
          Description :
        </label>

        <input
        id="fDescription "
          ref={descriptionRef}
          type="text"
          value={description}

          onChange={(e) => {
            setDescription(e.target.value);
          }}

          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
            }

            onDescriptionEnter(event);
          }}

          className="
            h-6.5
            w-full
            flex-1
            rounded
            border
            border-gray-300
            px-2
            text-xs
            outline-none
            focus:border-[#9fdfbc]
            focus:ring-1
            focus:ring-[#9fdfbc]
          "
        />

      </div>

      {/* =====================================================
          NOTE
          Common note for the entire receipt.
      ===================================================== */}

      <div className="flex w-full items-start gap-2">

        <label className="w-20.5 shrink-0 pt-1 text-right text-xs">
          Note :
        </label>

        <textarea
          ref={noteRef}
          value={note}

          onChange={(e) => {
            setNote(e.target.value);
          }}

          onKeyDown={onNoteEnter}

          className="
            h-10.75
            w-full
            flex-1
            resize-y
            rounded
            border
            border-gray-300
            p-2
            text-xs
            outline-none
            focus:border-[#9fdfbc]
            focus:ring-1
            focus:ring-[#9fdfbc]
          "
        />

      </div>

    </div>
  );
};

export default ReceiptBottomForm;
