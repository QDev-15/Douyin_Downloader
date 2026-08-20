export default function LoadingState() {
  return (
    <div className="flex w-full flex-col items-center gap-3 py-10 text-neutral-500 dark:text-neutral-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-white/20 dark:border-t-white" />
      <p className="text-sm">Đang phân tích video...</p>
    </div>
  );
}
