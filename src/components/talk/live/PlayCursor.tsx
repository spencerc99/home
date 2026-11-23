// playhtml's own arrow cursor (the one every playhtml site shows for other
// people), drawn in a person's colour. The arrow's tip is at (10, 7) of the
// 32x32 box.

export const CURSOR_TIP = { x: 10 / 32, y: 7 / 32 };

export function PlayCursor({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <g fill="none" fillRule="evenodd" transform="translate(10 7)">
        <path d="m6.148 18.473 1.863-1.003 1.615-.839-2.568-4.816h4.332l-11.379-11.408v16.015l3.316-3.221z" fill="#fff" />
        <path d="m6.431 17 1.765-.941-2.775-5.202h3.604l-8.025-8.043v11.188l2.53-2.442z" fill={color} />
      </g>
    </svg>
  );
}
