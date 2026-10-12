const memoryStorage = (() => {
  const values = new Map<string, string>();

  return {
    getItem: (name: string) => values.get(name) ?? null,

    removeItem: (name: string) => {
      values.delete(name);
    },

    setItem: (name: string, value: string) => {
      values.set(name, value);
    },
  };
})();

export function getStorage() {
  if (typeof window === "undefined") {
    return memoryStorage;
  }

  const browserStorage = window.localStorage;

  if (
    typeof browserStorage?.getItem === "function" &&
    typeof browserStorage?.removeItem === "function" &&
    typeof browserStorage?.setItem === "function"
  ) {
    return browserStorage;
  }

  return memoryStorage;
}
