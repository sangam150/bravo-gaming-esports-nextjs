export function scheduleEffectTask(task: () => void | Promise<void>) {
  let active = true;
  const timeoutId = window.setTimeout(() => {
    if (active) void task();
  }, 0);

  return () => {
    active = false;
    window.clearTimeout(timeoutId);
  };
}
