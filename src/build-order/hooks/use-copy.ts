// Clipboard copy; resolves true when copied.
export const useCopy = () => {
  // Promise.resolve first: `navigator.clipboard` is missing outside a secure page and would throw synchronously.
  const copy = (text: string) =>
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(text))
      .then(
        () => true,
        () => false,
      );

  return { copy };
};
