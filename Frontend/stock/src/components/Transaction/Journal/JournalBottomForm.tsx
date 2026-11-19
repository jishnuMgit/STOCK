import React from "react";

/* =========================================================
   TYPES
========================================================= */

export interface JournalBottomFormProps {
    description: string;
    setDescription: (value: string) => void;
    descriptionRef: React.RefObject<HTMLInputElement | null>;
    onDescriptionEnter: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onDescriptionClear?: () => void;

    note: string;
    setNote: (value: string) => void;
    noteRef: React.RefObject<HTMLTextAreaElement | null>;
    onNoteEnter: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

/* =========================================================
   JOURNAL BOTTOM FORM
========================================================= */

const JournalBottomForm: React.FC<JournalBottomFormProps> = ({
    description,
    setDescription,
    descriptionRef,
    onDescriptionEnter,
    onDescriptionClear = () => { },
    note,
    setNote,
    noteRef,
    onNoteEnter,
}) => {
    return (
        <div className="-mt-4 ml-10 w-[76%]">
            <div className="mb-2 flex w-[81%] items-center gap-2">
                <label className="w-24.5 shrink-0 text-right text-[14px]">
                    Description :
                </label>

                <input
                    maxLength={250}
                    id="txtDescription"
                    ref={descriptionRef}
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Delete" && event.ctrlKey) {
                            event.preventDefault();
                            event.stopPropagation();

                            onDescriptionClear();

                            return;
                        }

                        if (event.key === "Enter") {
                            event.preventDefault();
                            event.stopPropagation();
                        }

                        onDescriptionEnter(event);
                    }}
                    className="
            h-7.5
            w-full
            flex-1
            rounded
            border
            border-gray-300
            pl-[2px]
            pr-2
            text-[14px]
            outline-none
            focus:border-[#9fdfbc]
            focus:ring-1
            focus:ring-[#9fdfbc]
            text-[#344054]
          "
                />
            </div>

            <div className="flex w-[90%] items-start gap-2 ml-4">
                <label className="w-20.5 shrink-0 pt-1 text-right text-[14px]">
                    Note :
                </label>

                <textarea
                    maxLength={800}
                    id="txtNote"
                    ref={noteRef}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    onKeyDown={onNoteEnter}
                    className="
            h-10.75
            w-full
            flex-1
            resize-y
            rounded
            border
            border-gray-300
            py-2
            pl-0.5
            pr-2
            text-[14px]
            outline-none
            focus:border-[#9fdfbc]
            focus:ring-1
            focus:ring-[#9fdfbc]
            text-[#344054]
          "
                />
            </div>
        </div>
    );
};

export default JournalBottomForm;