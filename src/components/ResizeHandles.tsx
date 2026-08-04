import { getCurrentWindow } from "@tauri-apps/api/window";

type Direction =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

function Handle({ direction, className }: { direction: Direction; className: string }) {
  return (
    <div
      className={`absolute z-30 ${className}`}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        void getCurrentWindow().startResizeDragging(direction);
      }}
    />
  );
}

/** Thin invisible edge/corner strips over the window's transparent gutter
 * that drive native OS resizing - frameless windows don't get this for
 * free. */
export default function ResizeHandles() {
  return (
    <>
      <Handle direction="North" className="inset-x-2.5 top-0 h-1.5 cursor-n-resize" />
      <Handle direction="South" className="inset-x-2.5 bottom-0 h-1.5 cursor-s-resize" />
      <Handle direction="West" className="inset-y-2.5 left-0 w-1.5 cursor-w-resize" />
      <Handle direction="East" className="inset-y-2.5 right-0 w-1.5 cursor-e-resize" />
      <Handle direction="NorthWest" className="left-0 top-0 h-2.5 w-2.5 cursor-nw-resize" />
      <Handle direction="NorthEast" className="right-0 top-0 h-2.5 w-2.5 cursor-ne-resize" />
      <Handle direction="SouthWest" className="bottom-0 left-0 h-2.5 w-2.5 cursor-sw-resize" />
      <Handle direction="SouthEast" className="bottom-0 right-0 h-2.5 w-2.5 cursor-se-resize" />
    </>
  );
}
