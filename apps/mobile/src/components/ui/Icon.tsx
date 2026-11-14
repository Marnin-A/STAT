const paths = {
  star: "M12 3v18M4 7.5l16 9M4 16.5l16-9",
  home: "m3 10 9-7 9 7v11h-6v-7H9v7H3Z",
  activity: "M3 12h4l3-7 4 14 3-7h4",
  user: "M5 21v-2a7 7 0 0 1 14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  arrow: "M6 18 18 6M6 6h12v12",
  id: "M3 5h18v15H3ZM8 3v4m8-4v4M6 12h6m-3-3v6m7-4h2m-2 4h2",
  pin: "M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z",
  chevron: "m9 5 7 7-7 7",
};
export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
