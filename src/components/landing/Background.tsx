export function Background() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100/90 via-[#f4f8fd] to-white" />
      <div className="absolute -top-32 right-[8%] size-[420px] rounded-full bg-sky-200/50 blur-3xl" />
      <div className="absolute top-[28%] left-[-6%] size-[380px] rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="absolute top-[60%] right-[-8%] size-[420px] rounded-full bg-amber-100/60 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[20%] size-[360px] rounded-full bg-sky-200/40 blur-3xl" />
    </div>
  );
}