declare module '*.module.css' {
  const styles: Record<string, string>;
  export default styles;
}

// Webpack применяет глобальные стили при импорте CSS.
declare module '*.css' {}

declare module '*.svg' {
  const url: string;
  export default url;
}
