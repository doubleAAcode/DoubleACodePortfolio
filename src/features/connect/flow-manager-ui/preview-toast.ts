type PreviewToastHandler = (...args: unknown[]) => string;

const ignorePreviewMutation: PreviewToastHandler = () => "flow-manager-preview";

export const toast = Object.assign(ignorePreviewMutation, {
  success: ignorePreviewMutation,
  error: ignorePreviewMutation,
  warning: ignorePreviewMutation,
  info: ignorePreviewMutation,
});
