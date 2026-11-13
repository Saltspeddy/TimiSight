// Ambient type declarations for CSS imports.
//
// Expo's Metro web bundler understands `import './x.css'` (side-effect global
// styles) and CSS Modules (`import classes from './x.module.css'`), but
// TypeScript has no built-in knowledge of these, so a bare `tsc --noEmit`
// reports "Cannot find module './x.css'". These ambient declarations tell the
// type checker the imports are valid. They have no runtime effect — the actual
// CSS handling is done by the bundler.

// CSS Modules: `import classes from './styles.module.css'` -> a class-name map.
declare module '*.module.css' {
  const classes: { readonly [className: string]: string };
  export default classes;
}

// Plain/global CSS side-effect imports: `import './global.css'`.
declare module '*.css';
