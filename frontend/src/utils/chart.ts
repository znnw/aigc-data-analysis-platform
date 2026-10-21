export const parseChartOption = (source?: string | null): Record<string, any> | undefined => {
  if (!source?.trim()) {
    return undefined;
  }

  try {
    const option = JSON.parse(source);
    if (!option || typeof option !== 'object' || Array.isArray(option)) {
      return undefined;
    }
    option.color = option.color || ['#4263b5', '#0f9f8f', '#e8a23a', '#e85d4a', '#7b8790'];
    return option;
  } catch {
    return undefined;
  }
};

export const parseVisibleChartOption = (source?: string | null) => {
  const option = parseChartOption(source);
  if (option) {
    option.title = undefined;
  }
  return option;
};
